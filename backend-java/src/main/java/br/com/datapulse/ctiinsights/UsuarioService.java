package br.com.datapulse.ctiinsights;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static br.com.datapulse.ctiinsights.ErrosApi.Failure;

@Service
class UsuarioService {
    enum Role { CONSULTOR, GESTOR, ADMINISTRADOR }
    enum Status { PENDENTE, APROVADO, REJEITADO }

    record Registration(String nome, String email, String senha, Role papel) {}
    record Credentials(String email, String senha) {}
    record Review(Status status, Role papel) {}
    record Reviewer(String nome, String email) {}
    record Account(long id, String nome, String email, Role papel, Role papelSolicitado,
                   Status status, Instant criadoEm, Instant avaliadoEm, Reviewer avaliadoPor,
                   boolean trocarSenha) {}
    record TrocaSenha(String senhaAtual, String novaSenha) {}

    // Senha temporária: 12 caracteres sem os que se confundem (0/O, 1/l/I)
    private static final String ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int TAMANHO_SENHA_TEMPORARIA = 12;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private static final String SELECT = """
            SELECT u.*, a.nome AS avaliador_nome, a.email AS avaliador_email
            FROM usuario u LEFT JOIN usuario a ON a.id = u.avaliado_por_id
            """;

    private final JdbcClient jdbc;
    private final PasswordEncoder encoder;
    private final String dummyHash;

    UsuarioService(JdbcClient jdbc, PasswordEncoder encoder) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.dummyHash = encoder.encode(java.util.UUID.randomUUID().toString());
    }

    Account cadastrar(Registration input) {
        String name = input.nome() == null ? "" : input.nome().strip();
        if (name.length() > 150 || name.split("\\s+").length < 2 || input.papel() == null) {
            throw new Failure(HttpStatus.BAD_REQUEST, "Informe nome, sobrenome e papel.");
        }
        return insert(name, email(input.email()), input.senha(), input.papel(), Status.PENDENTE);
    }

    @Transactional
    public void bootstrap(String name, String address, String password) {
        if (name.isBlank() && address.isBlank() && password.isEmpty()) {
            return;
        }
        jdbc.sql("LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE").update();
        if (jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM usuario WHERE papel = 'ADMINISTRADOR' AND status = 'APROVADO')
                """).query(Boolean.class).single()) {
            return;
        }
        if (name.isBlank() || name.length() > 150) {
            throw new IllegalStateException("Configure ADMIN_NAME para inicializar a administração.");
        }
        insert(name.strip(), email(address), password, Role.ADMINISTRADOR, Status.APROVADO);
    }

    private Account insert(String name, String email, String password, Role role, Status status) {
        if (!fitsBcrypt(password) || password.codePointCount(0, password.length()) < 8) {
            throw new Failure(HttpStatus.BAD_REQUEST, "A senha deve ter ao menos 8 caracteres e até 72 bytes.");
        }
        var created = jdbc.sql("""
                INSERT INTO usuario (nome, email, senha_hash, papel, papel_solicitado, status)
                VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING RETURNING id
                """).params(name, email, encoder.encode(password), role.name(), role.name(), status.name())
                .query(Long.class).optional();
        return buscar(created.orElseThrow(() -> new Failure(HttpStatus.CONFLICT, "E-mail já cadastrado.")));
    }

    Account autenticar(Credentials input) {
        String address = input.email() == null ? "" : input.email().strip().toLowerCase(Locale.ROOT);
        if (!fitsBcrypt(input.senha()) || address.length() > 254) {
            throw invalidCredentials();
        }
        record Login(Account account, String hash) {}
        var login = jdbc.sql(SELECT + " WHERE u.email = ?").param(address)
                .query((rs, row) -> new Login(map(rs, row), rs.getString("senha_hash"))).optional();
        boolean matches = encoder.matches(input.senha(), login.map(Login::hash).orElse(dummyHash));
        if (!matches || login.isEmpty()) {
            throw invalidCredentials();
        }
        var account = login.get().account();
        if (account.status() != Status.APROVADO) {
            throw new Failure(HttpStatus.FORBIDDEN, "Cadastro sem aprovação.", account.status().name());
        }
        return account;
    }

    List<Account> listar() {
        return jdbc.sql(SELECT + " ORDER BY u.id DESC").query(UsuarioService::map).list();
    }

    Account buscar(long id) {
        return jdbc.sql(SELECT + " WHERE u.id = ?").param(id).query(UsuarioService::map).optional()
                .orElseThrow(() -> new Failure(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
    }

    Role papelAprovado(long id) {
        return jdbc.sql("SELECT papel FROM usuario WHERE id = ? AND status = 'APROVADO'")
                .param(id).query(String.class).optional().map(Role::valueOf).orElse(null);
    }

    @Transactional
    public Account avaliar(long id, Review input, long reviewer) {
        if (input.status() == null || input.status() == Status.PENDENTE || input.papel() == null) {
            throw new Failure(HttpStatus.BAD_REQUEST, "Informe aprovação ou rejeição e um papel.");
        }
        if (id == reviewer && (input.status() != Status.APROVADO || input.papel() != Role.ADMINISTRADOR)) {
            throw new Failure(HttpStatus.CONFLICT, "Você deve manter sua própria conta administrativa aprovada.");
        }
        jdbc.sql("LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE").update();
        if (papelAprovado(reviewer) != Role.ADMINISTRADOR) {
            throw new Failure(HttpStatus.FORBIDDEN, "Acesso restrito à administração.");
        }
        jdbc.sql("""
                UPDATE usuario SET status = ?, papel = ?, avaliado_por_id = ?,
                    avaliado_em = CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE id = ?
                """).params(input.status().name(), input.papel().name(), reviewer, id).update();
        return buscar(id);
    }

    // O administrador gera uma senha temporária para quem esqueceu a sua. Ela
    // aparece uma única vez na resposta; no banco fica só o hash. No próximo
    // acesso, o usuário é levado a criar uma senha nova (trocar_senha).
    @Transactional
    public String gerarSenhaTemporaria(long id, long administrador) {
        if (id == administrador) {
            throw new Failure(HttpStatus.CONFLICT, "Para mudar a sua própria senha, use \"Trocar senha\".");
        }
        jdbc.sql("LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE").update();
        if (papelAprovado(administrador) != Role.ADMINISTRADOR) {
            throw new Failure(HttpStatus.FORBIDDEN, "Acesso restrito à administração.");
        }
        buscar(id);
        var senha = new StringBuilder(TAMANHO_SENHA_TEMPORARIA);
        for (int i = 0; i < TAMANHO_SENHA_TEMPORARIA; i++) {
            senha.append(ALFABETO_SENHA.charAt(ALEATORIO.nextInt(ALFABETO_SENHA.length())));
        }
        jdbc.sql("UPDATE usuario SET senha_hash = ?, trocar_senha = TRUE WHERE id = ?")
                .params(encoder.encode(senha.toString()), id).update();
        return senha.toString();
    }

    // Qualquer usuário logado troca a própria senha, confirmando a atual
    @Transactional
    public void trocarSenha(long id, TrocaSenha input) {
        String atual = input == null ? null : input.senhaAtual();
        String nova = input == null ? null : input.novaSenha();
        String hash = jdbc.sql("SELECT senha_hash FROM usuario WHERE id = ? AND status = 'APROVADO'")
                .param(id).query(String.class).optional()
                .orElseThrow(() -> new Failure(HttpStatus.UNAUTHORIZED, "Autenticação necessária."));
        if (!fitsBcrypt(atual) || !encoder.matches(atual, hash)) {
            throw new Failure(HttpStatus.BAD_REQUEST, "A senha atual não confere.");
        }
        if (!fitsBcrypt(nova) || nova.codePointCount(0, nova.length()) < 8) {
            throw new Failure(HttpStatus.BAD_REQUEST, "A senha deve ter ao menos 8 caracteres e até 72 bytes.");
        }
        if (nova.equals(atual)) {
            throw new Failure(HttpStatus.BAD_REQUEST, "A senha nova deve ser diferente da atual.");
        }
        jdbc.sql("UPDATE usuario SET senha_hash = ?, trocar_senha = FALSE WHERE id = ?")
                .params(encoder.encode(nova), id).update();
    }

    static Instant utc(ResultSet rs, String column) throws SQLException {
        LocalDateTime value = rs.getObject(column, LocalDateTime.class);
        return value == null ? null : value.toInstant(ZoneOffset.UTC);
    }

    private static Account map(ResultSet rs, int row) throws SQLException {
        String reviewer = rs.getString("avaliador_email");
        return new Account(rs.getLong("id"), rs.getString("nome"), rs.getString("email"),
                Role.valueOf(rs.getString("papel")), Role.valueOf(rs.getString("papel_solicitado")),
                Status.valueOf(rs.getString("status")), utc(rs, "criado_em"), utc(rs, "avaliado_em"),
                reviewer == null ? null : new Reviewer(rs.getString("avaliador_nome"), reviewer),
                rs.getBoolean("trocar_senha"));
    }

    private static boolean fitsBcrypt(String password) {
        return password != null && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    private static String email(String input) {
        String value = input == null ? "" : input.strip().toLowerCase(Locale.ROOT);
        if (value.length() > 254 || !value.matches("[^@\\s]+@[^@\\s]+")) {
            throw new Failure(HttpStatus.BAD_REQUEST, "Informe um e-mail válido.");
        }
        return value;
    }

    private static Failure invalidCredentials() {
        return new Failure(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
    }
}

@Configuration
class AdminBootstrap {
    @Bean
    ApplicationRunner adminInitializer(UsuarioService accounts, @Value("${cti.admin.nome}") String name,
                                       @Value("${cti.admin.email}") String email,
                                       @Value("${cti.admin.senha}") String password) {
        return args -> accounts.bootstrap(name, email, password);
    }
}
