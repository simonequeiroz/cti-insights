package br.com.datapulse.ctiinsights;

import java.io.IOException;
import java.net.CookieManager;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:postgresql:.*")
class ApiIntegrationTests {
    private static final String DB = System.getenv("TEST_DB_URL");
    private static final String USER = System.getenv("TEST_DB_USER");
    private static final String PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SCHEMA = "test_" + UUID.randomUUID().toString().replace("-", "");
    private static final JsonMapper JSON = new JsonMapper();
    private static final String ROW = """
            {"codigo_cliente":"C001","nome_cliente":"Alfa Ltda","consultor":"Ana Lima",
             "segmento":"Indústria","nivel_cliente":"A","faturamento_anual":1200,
             "data_contratacao":"2025-01-15","servicos_contratados":"MPLS;Firewall","uf":"SP"}
            """;
    private static final AtomicReference<JsonNode> LAST_REQUEST = new AtomicReference<>();
    private static HttpServer etl;
    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry properties) throws Exception {
        try (var connection = DriverManager.getConnection(DB, USER, PASSWORD);
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + SCHEMA);
            connection.setSchema(SCHEMA);
            ScriptUtils.executeSqlScript(connection, new FileSystemResource("../database/schema.sql"));
        }
        etl = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        etl.createContext("/etl", ApiIntegrationTests::mockEtl);
        etl.start();
        properties.add("spring.datasource.url", () -> DB);
        properties.add("spring.datasource.username", () -> USER);
        properties.add("spring.datasource.password", () -> PASSWORD);
        properties.add("spring.datasource.hikari.schema", () -> SCHEMA);
        properties.add("cti.admin.nome", () -> "Admin Teste");
        properties.add("cti.admin.email", () -> "admin@example.test");
        properties.add("cti.admin.senha", () -> "apenas-teste-local");
        properties.add("cti.etl.url", () -> "http://127.0.0.1:" + etl.getAddress().getPort());
        properties.add("cti.etl.key", () -> "etl-local-teste");
        properties.add("server.servlet.session.cookie.secure", () -> false);
        properties.add("cti.cors.allowed-origins", () -> "https://front-cti.example.test");
    }

    @AfterAll
    static void stopMock() throws SQLException {
        if (etl != null) {
            etl.stop(0);
            try (var connection = DriverManager.getConnection(DB, USER, PASSWORD);
                 var command = connection.createStatement()) {
                command.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
            }
        }
    }

    @Test
    void enforcesAuthenticationApprovalAndRoles() throws Exception {
        var anonymous = browser();
        var admin = admin();
        assertThat(send(anonymous, "GET", "/health", null).statusCode()).isEqualTo(200);
        var semLogin = send(anonymous, "GET", "/clientes", null);
        assertThat(semLogin.statusCode()).isEqualTo(401);
        // Texto exato com acentos: pega arquivo salvo com codificação errada
        assertThat(body(semLogin).path("mensagem").asString()).isEqualTo("Autenticação necessária.");
        assertThat(raw(anonymous, "POST", "/auth/login", "{}", null).statusCode()).isEqualTo(403);
        var created = send(anonymous, "POST", "/auth/cadastro", """
                {"nome":"Pessoa Gestora","email":"GESTOR@example.test","senha":"senha-de-teste","papel":"ADMINISTRADOR"}
                """);
        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(created.body()).doesNotContain("senha", "hash");
        assertThat(body(created).path("status").asString()).isEqualTo("PENDENTE");
        String url = "/usuarios/" + body(created).path("id").asLong();
        String credentials = credentials("gestor@example.test", "senha-de-teste");
        var pending = send(anonymous, "POST", "/auth/login", credentials);
        assertThat(pending.statusCode()).isEqualTo(403);
        assertThat(body(pending).path("codigo").asString()).isEqualTo("PENDENTE");

        var approved = send(admin, "PATCH", url, "{\"status\":\"APROVADO\",\"papel\":\"GESTOR\"}");
        assertThat(approved.statusCode()).isEqualTo(200);
        assertThat(body(approved).path("avaliadoPor").path("nome").asString()).isEqualTo("Admin Teste");
        assertThat(send(anonymous, "POST", "/auth/login", credentials).statusCode()).isEqualTo(200);
        assertThat(send(anonymous, "GET", "/usuarios", null).statusCode()).isEqualTo(403);
        assertThat(send(anonymous, "POST", "/uploads", upload(10, ROW)).statusCode()).isEqualTo(403);
        assertThat(send(anonymous, "GET", "/clientes", null).statusCode()).isEqualTo(200);
        assertThat(send(admin, "PATCH", url, "{\"status\":\"APROVADO\",\"papel\":\"CONSULTOR\"}").statusCode())
                .isEqualTo(200);
        assertThat(send(anonymous, "GET", "/uploads", null).statusCode()).isEqualTo(200);
        assertThat(send(anonymous, "DELETE", "/clientes/1", null).statusCode()).isEqualTo(403);
        assertThat(send(admin, "PATCH", url, "{\"status\":\"REJEITADO\",\"papel\":\"GESTOR\"}").statusCode()).isEqualTo(200);
        assertThat(send(anonymous, "GET", "/clientes", null).statusCode()).isEqualTo(401);
        assertThat(send(admin, "POST", "/auth/logout", null).statusCode()).isEqualTo(204);
        assertThat(send(admin, "GET", "/usuarios", null).statusCode()).isEqualTo(401);
    }

    @Test
    void readsOnlyNormalizedPortfolioAndPreservesHistoryOnFailedUploadAndCrud() throws Exception {
        var admin = admin();
        var success = send(admin, "POST", "/uploads", upload(10, ROW));
        assertThat(success.statusCode()).isEqualTo(201);
        long uploadId = body(success).path("id").asLong();
        assertThat(body(success).path("status").asString()).isEqualTo("NORMALIZADO");
        assertThat(LAST_REQUEST.get().path("recebidas").asInt()).isEqualTo(10);
        assertThat(LAST_REQUEST.get().path("linhas").get(0).path("codigo_cliente").asString()).isEqualTo("C001");

        var clients = body(send(admin, "GET", "/clientes", null));
        assertThat(clients.size()).isEqualTo(1);
        long id = clients.get(0).path("id").asLong();
        assertThat(clients.get(0).path("servicos").get(0).asString()).isEqualTo("Firewall");
        assertThat(send(admin, "GET", "/clientes/" + id, null).statusCode()).isEqualTo(200);

        var bad = send(admin, "POST", "/uploads", "{}");
        assertThat(bad.statusCode()).isEqualTo(400);
        assertThat(body(bad).path("codigo").asString()).isEqualTo("EXCEL_INVALIDO");
        var missing = send(admin, "POST", "/uploads", upload(1, ROW.replace("Alfa Ltda", "")));
        assertThat(missing.statusCode()).isEqualTo(400);
        assertThat(body(missing).path("codigo").asString()).isEqualTo("COLUNA_OBRIGATORIA");
        var rejected = send(admin, "POST", "/uploads", upload(2, ROW + "," + ROW));
        assertThat(rejected.statusCode()).isEqualTo(400);
        assertThat(body(rejected).path("codigo").asString()).isEqualTo("CLIENTE_DUPLICADO");
        var failed = send(admin, "POST", "/uploads", upload(99, ROW));
        assertThat(failed.statusCode()).isEqualTo(502);
        assertThat(body(failed).path("status").asString()).isEqualTo("ERRO_ETL");

        var history = body(send(admin, "GET", "/uploads", null));
        assertThat(history.get(0).path("status").asString()).isEqualTo("ERRO_ETL");
        assertThat(history.get(1).path("status").asString()).isEqualTo("ERRO_SCHEMA");

        var dashboard = body(send(admin, "GET", "/dashboard", null));
        assertThat(dashboard.path("envio").path("id").asLong()).isEqualTo(uploadId);
        assertThat(dashboard.path("estatisticas").path("resumo").path("totalClientes").asInt()).isEqualTo(1);
        assertThat(dashboard.path("insights").get(0).asString()).isEqualTo("Insight do ETL");
        assertThat(body(send(admin, "GET", "/clientes", null))).isEqualTo(clients);

        var duplicado = send(admin, "POST", "/clientes", ROW);
        assertThat(duplicado.statusCode()).isEqualTo(409);
        assertThat(body(duplicado).path("codigo").asString()).isEqualTo("CLIENTE_DUPLICADO");
        var edit = send(admin, "PUT", "/clientes/" + id, ROW.replace("Alfa Ltda", "Alfa Nova"));
        assertThat(edit.statusCode()).isEqualTo(200);
        var changed = body(send(admin, "GET", "/clientes", null)).get(0);
        assertThat(changed.path("nome_cliente").asString()).isEqualTo("Alfa Nova");
        assertThat(send(admin, "GET", "/clientes/" + id, null).statusCode()).isEqualTo(404);
        assertThat(send(admin, "DELETE", "/clientes/" + changed.path("id").asLong(), null).statusCode()).isEqualTo(200);
        assertThat(body(send(admin, "GET", "/clientes", null)).size()).isZero();
        assertThat(send(admin, "POST", "/clientes", ROW).statusCode()).isEqualTo(201);
        try (var connection = DriverManager.getConnection(DB, USER, PASSWORD);
             var statement = connection.prepareStatement("SELECT nome FROM " + SCHEMA + ".cliente WHERE id = ?")) {
            statement.setLong(1, id);
            try (var results = statement.executeQuery()) {
                assertThat(results.next()).isTrue();
                assertThat(results.getString(1)).isEqualTo("Alfa Ltda");
            }
        }
    }

    @Test
    void administratorChangesRoleBlocksAccessAndIssuesTemporaryPassword() throws Exception {
        var admin = admin();
        var anonymous = browser();
        var created = send(anonymous, "POST", "/auth/cadastro",
                "{\"nome\":\"Pessoa Consultora\",\"email\":\"consultora@example.test\",\"senha\":\"senha-original\",\"papel\":\"CONSULTOR\"}");
        assertThat(created.statusCode()).isEqualTo(201);
        long id = body(created).path("id").asLong();
        String url = "/usuarios/" + id;
        assertThat(send(admin, "PATCH", url, "{\"status\":\"APROVADO\",\"papel\":\"CONSULTOR\"}").statusCode())
                .isEqualTo(200);

        var user = browser();
        var login = send(user, "POST", "/auth/login", credentials("consultora@example.test", "senha-original"));
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(body(login).path("trocarSenha").asBoolean()).isFalse();
        assertThat(send(user, "GET", "/uploads", null).statusCode()).isEqualTo(200);

        // Trocar o papel vale na hora, mesmo com a sessão aberta
        assertThat(send(admin, "PATCH", url, "{\"status\":\"APROVADO\",\"papel\":\"GESTOR\"}").statusCode())
                .isEqualTo(200);
        assertThat(send(user, "GET", "/uploads", null).statusCode()).isEqualTo(403);

        // Senha temporária: só o administrador gera, e não para si mesmo
        assertThat(send(user, "POST", url + "/senha-temporaria", null).statusCode()).isEqualTo(403);
        assertThat(send(admin, "POST", "/usuarios/1/senha-temporaria", null).statusCode()).isEqualTo(409);
        var temporaria = send(admin, "POST", url + "/senha-temporaria", null);
        assertThat(temporaria.statusCode()).isEqualTo(200);
        String senhaTemporaria = body(temporaria).path("senhaTemporaria").asString();
        assertThat(senhaTemporaria).hasSize(12);
        assertThat(send(admin, "GET", "/usuarios", null).body()).doesNotContain(senhaTemporaria);

        var depois = browser();
        assertThat(send(depois, "POST", "/auth/login", credentials("consultora@example.test", "senha-original"))
                .statusCode()).isEqualTo(401);
        var comTemporaria = send(depois, "POST", "/auth/login", credentials("consultora@example.test", senhaTemporaria));
        assertThat(comTemporaria.statusCode()).isEqualTo(200);
        assertThat(body(comTemporaria).path("trocarSenha").asBoolean()).isTrue();

        // Troca da senha: confere a atual, o tamanho e que a nova é diferente
        assertThat(send(depois, "POST", "/auth/senha", troca("errada-123", "senha-nova-123")).statusCode()).isEqualTo(400);
        assertThat(send(depois, "POST", "/auth/senha", troca(senhaTemporaria, "curta")).statusCode()).isEqualTo(400);
        assertThat(send(depois, "POST", "/auth/senha", troca(senhaTemporaria, "senha-nova-123")).statusCode()).isEqualTo(204);
        assertThat(send(anonymous, "POST", "/auth/senha", troca("x", "senha-nova-456")).statusCode()).isEqualTo(401);
        var novaSessao = browser();
        var comNova = send(novaSessao, "POST", "/auth/login", credentials("consultora@example.test", "senha-nova-123"));
        assertThat(comNova.statusCode()).isEqualTo(200);
        assertThat(body(comNova).path("trocarSenha").asBoolean()).isFalse();

        // Bloquear o acesso derruba a sessão aberta na próxima requisição
        assertThat(send(admin, "PATCH", url, "{\"status\":\"REJEITADO\",\"papel\":\"GESTOR\"}").statusCode())
                .isEqualTo(200);
        assertThat(send(novaSessao, "GET", "/clientes", null).statusCode()).isEqualTo(401);
        assertThat(send(browser(), "POST", "/auth/login", credentials("consultora@example.test", "senha-nova-123"))
                .statusCode()).isEqualTo(403);
    }

    @Test
    void corsAllowsOnlyConfiguredOrigin() throws Exception {
        var uri = URI.create("http://127.0.0.1:" + port + "/api/uploads");
        var allowed = browser().send(HttpRequest.newBuilder(uri)
                .header("Origin", "https://front-cti.example.test")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,x-csrf-token")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(allowed.statusCode()).isEqualTo(200);
        assertThat(allowed.headers().firstValue("Access-Control-Allow-Origin")).contains("https://front-cti.example.test");
        assertThat(allowed.headers().firstValue("Access-Control-Allow-Credentials")).contains("true");
        var denied = browser().send(HttpRequest.newBuilder(uri)
                .header("Origin", "https://outro.example.test")
                .header("Access-Control-Request-Method", "POST")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(denied.statusCode()).isEqualTo(403);
    }

    private static String troca(String atual, String nova) {
        return "{\"senhaAtual\":\"" + atual + "\",\"novaSenha\":\"" + nova + "\"}";
    }

    private HttpClient admin() throws Exception {
        var client = browser();
        assertThat(send(client, "POST", "/auth/login", credentials("admin@example.test", "apenas-teste-local"))
                .statusCode()).isEqualTo(200);
        return client;
    }

    private static HttpClient browser() {
        return HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
    }

    private HttpResponse<String> send(HttpClient client, String method, String path, String value) throws Exception {
        JsonNode csrf = method.equals("GET") ? null : body(raw(client, "GET", "/auth/csrf", null, null));
        return raw(client, method, path, value, csrf);
    }

    private HttpResponse<String> raw(HttpClient client, String method, String path, String value,
                                     JsonNode csrf) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path));
        if (csrf != null) {
            request.header(csrf.path("headerName").asString(), csrf.path("token").asString());
        }
        if (value != null) {
            request.header("Content-Type", "application/json");
        }
        return client.send(request.method(method, value == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(value)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private static JsonNode body(HttpResponse<String> response) {
        return JSON.readTree(response.body());
    }

    private static String credentials(String email, String password) {
        return "{\"email\":\"" + email + "\",\"senha\":\"" + password + "\"}";
    }

    private static String upload(int received, String rows) {
        return "{\"nomeArquivo\":\"carteira.xlsx\",\"linhasLidas\":" + received + ",\"linhas\":[" + rows + "]}";
    }

    private static void mockEtl(HttpExchange exchange) throws IOException {
        try (exchange) {
            if (!exchange.getRequestMethod().equals("POST")
                    || !"etl-local-teste".equals(exchange.getRequestHeaders().getFirst("X-ETL-Key"))) {
                exchange.sendResponseHeaders(401, -1);
                return;
            }
            JsonNode request = JSON.readTree(exchange.getRequestBody());
            LAST_REQUEST.set(request);
            if (request.path("recebidas").asInt() == 99) {
                exchange.sendResponseHeaders(500, -1);
                return;
            }
            long id = request.path("telemetriaId").asLong();
            try (var connection = DriverManager.getConnection(DB, USER, PASSWORD);
                 var statement = connection.createStatement()) {
                connection.setSchema(SCHEMA);
                connection.setAutoCommit(false);
                for (JsonNode row : request.path("linhas")) {
                    statement.execute("""
                            INSERT INTO consultor (nome) VALUES ('Ana Lima') ON CONFLICT DO NOTHING;
                            INSERT INTO servico (nome) VALUES ('MPLS'), ('Firewall') ON CONFLICT DO NOTHING;
                            """);
                    try (var insert = connection.prepareStatement("""
                            INSERT INTO cliente (telemetria_id, codigo, nome, segmento, nivel, faturamento_anual, consultor_id)
                            SELECT ?, ?, ?, 'Indústria', 'A', 1200, id FROM consultor WHERE nome = 'Ana Lima'
                            """)) {
                        insert.setLong(1, id);
                        insert.setString(2, row.path("codigo_cliente").asString());
                        insert.setString(3, row.path("nome_cliente").asString());
                        insert.executeUpdate();
                    }
                    statement.execute("INSERT INTO contrato (cliente_id, data_inicio) SELECT id, DATE '2025-01-15' "
                            + "FROM cliente WHERE telemetria_id = " + id);
                    statement.execute("INSERT INTO contrato_servico SELECT ct.id, s.id FROM contrato ct "
                            + "JOIN cliente c ON c.id = ct.cliente_id CROSS JOIN servico s WHERE c.telemetria_id = " + id);
                }
                int count = request.path("linhas").size();
                statement.execute("""
                        INSERT INTO estatistica (telemetria_id, gerado_em, resultado)
                        VALUES (%d, now(), '{"resumo":{"totalClientes":%d},"qualidade":{"linhasValidas":%d}}');
                        INSERT INTO insight (telemetria_id, data_geracao, descricao) VALUES (%d, now(), 'Insight do ETL');
                        UPDATE telemetria SET status = 'NORMALIZADO' WHERE id = %d AND status = 'PROCESSANDO';
                        """.formatted(id, count, count, id, id));
                connection.commit();
            } catch (SQLException error) {
                throw new IOException("Falha ao simular a persistência do ETL", error);
            }
            byte[] response = ("{\"ok\":true,\"telemetriaId\":" + id + "}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
        }
    }
}
