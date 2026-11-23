package br.com.datapulse.ctiinsights;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static br.com.datapulse.ctiinsights.ApiErrors.Failure;

@Service
class Portfolio {
    record Upload(long id, String tipoOperacao, String nomeArquivo, Instant dataHora, String status,
                  Integer linhasLidas, String mensagem, String enviadoPor, Integer linhasImportadas) {}
    record Dashboard(Upload envio, Instant geradoEm, JsonNode estatisticas, List<String> insights) {}
    record Client(long id, String consultor, String codigo_cliente, String nome_cliente, String segmento,
                  String nivel_cliente, BigDecimal faturamento, LocalDate data_contratacao, String servico,
                  List<String> servicos, String cidade, String uf) {

        ImportData.Row toRow() {
            return new ImportData.Row(codigo_cliente, nome_cliente, consultor, segmento, nivel_cliente,
                    faturamento, data_contratacao.toString(), String.join(";", servicos), cidade, uf);
        }
    }
    enum Operation { UPLOAD, CRIACAO_CLIENTE, EDICAO_CLIENTE, EXCLUSAO_CLIENTE }

    private static final String ACTIVE = """
            SELECT MAX(id) FROM telemetria WHERE status = 'NORMALIZADO'
            """;
    private static final String UPLOADS = """
            SELECT t.*, u.nome AS enviado_por,
                   (e.resultado #>> '{qualidade,linhasValidas}')::integer AS linhas_importadas
            FROM telemetria t LEFT JOIN usuario u ON t.usuario_id = u.id
            LEFT JOIN estatistica e ON e.telemetria_id = t.id
            """;
    private static final String CLIENTS = """
            SELECT c.*, co.nome AS consultor, ct.data_inicio,
                   ARRAY(SELECT s.nome FROM contrato_servico cs JOIN servico s ON s.id = cs.servico_id
                         WHERE cs.contrato_id = ct.id ORDER BY s.nome) AS servicos
            FROM cliente c LEFT JOIN consultor co ON co.id = c.consultor_id
            LEFT JOIN contrato ct ON ct.cliente_id = c.id
            WHERE c.telemetria_id = (
            """ + ACTIVE + ") ";

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final ImportData validation;
    private final EtlClient etl;
    private final TransactionTemplate committedInsert;

    Portfolio(JdbcClient jdbc, JsonMapper json, ImportData validation, EtlClient etl,
              PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.json = json;
        this.validation = validation;
        this.etl = etl;
        this.committedInsert = new TransactionTemplate(manager);
        committedInsert.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    List<Upload> uploads() {
        return jdbc.sql(UPLOADS + " ORDER BY t.id DESC").query(Portfolio::mapUpload).list();
    }

    List<Client> clients() {
        return jdbc.sql(CLIENTS + " ORDER BY c.nome, c.id").query(Portfolio::mapClient).list();
    }

    Client client(long id) {
        return jdbc.sql(CLIENTS + " AND c.id = ?").param(id).query(Portfolio::mapClient).optional()
                .orElseThrow(Portfolio::clientMissing);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dashboard dashboard() {
        var upload = jdbc.sql(UPLOADS + " WHERE t.id = (" + ACTIVE + ")").query(Portfolio::mapUpload)
                .optional().orElseThrow(() -> new Failure(HttpStatus.NOT_FOUND, "Nenhum envio normalizado."));
        var insights = jdbc.sql("SELECT descricao FROM insight WHERE telemetria_id = ? ORDER BY id")
                .param(upload.id()).query(String.class).list();
        return jdbc.sql("SELECT gerado_em, resultado FROM estatistica WHERE telemetria_id = ?")
                .param(upload.id()).query((rs, row) -> new Dashboard(upload, Accounts.utc(rs, "gerado_em"),
                        json.readTree(rs.getString("resultado")), insights))
                .optional().orElseThrow(() -> new Failure(HttpStatus.NOT_FOUND, "Estatísticas indisponíveis."));
    }

    @Transactional
    public Upload upload(ImportData.Upload request, long actor) {
        List<ImportData.Row> rows;
        try {
            rows = validation.rows(request);
        } catch (Failure error) {
            var filename = request.nomeArquivo();
            var count = request.linhasLidas();
            insert(Operation.UPLOAD, filename == null || filename.isBlank() ? "arquivo" : filename,
                    count == null || count < 0 ? null : count, actor, "ERRO_SCHEMA", error.getMessage());
            throw error;
        }
        lockPortfolio();
        return process(Operation.UPLOAD, request.nomeArquivo().strip(), request.linhasLidas(), rows, actor);
    }

    @Transactional
    public Upload change(Operation operation, Long id, ImportData.Input input, long actor) {
        lockPortfolio();
        ImportData.Row replacement = operation == Operation.EXCLUSAO_CLIENTE ? null : validation.row(input);
        var previous = clients();
        Client target = id == null ? null : previous.stream().filter(client -> client.id() == id)
                .findFirst().orElseThrow(Portfolio::clientMissing);
        var rows = new ArrayList<ImportData.Row>();
        for (Client client : previous) {
            if (client.equals(target)) {
                continue;
            }
            if (replacement != null && client.codigo_cliente().equals(replacement.codigo_cliente())) {
                throw new Failure(HttpStatus.CONFLICT, "Código de cliente já existe na carteira.");
            }
            rows.add(client.toRow());
        }
        if (replacement != null) {
            rows.add(replacement);
        }
        return process(operation, "Alteração manual da carteira", rows.size(), rows, actor);
    }

    private void lockPortfolio() {
        if (!jdbc.sql("SELECT pg_try_advisory_xact_lock(91376, 1)").query(Boolean.class).single()) {
            throw new Failure(HttpStatus.CONFLICT, "A carteira está sendo processada. Tente novamente.");
        }
    }

    private Upload process(Operation operation, String filename, int received, List<ImportData.Row> rows, long actor) {
        long id = insert(operation, filename, received, actor, "PROCESSANDO", "");
        boolean ok = etl.process(id, received, rows);
        jdbc.sql("""
                UPDATE telemetria SET status = 'ERRO_ETL', mensagem = ? WHERE id = ? AND status = 'PROCESSANDO'
                """).params(ok ? "O ETL respondeu sem confirmar a gravação." : "Não foi possível concluir o ETL.", id)
                .update();
        return jdbc.sql(UPLOADS + " WHERE t.id = ?").param(id).query(Portfolio::mapUpload).single();
    }

    private long insert(Operation operation, String filename, Integer received, long actor,
                        String status, String message) {
        return committedInsert.execute(transaction -> jdbc.sql("""
                INSERT INTO telemetria (tipo_operacao, nome_arquivo, linhas_lidas, usuario_id, status, mensagem)
                VALUES (:op, :arquivo, :total, :actor, :status, :msg) RETURNING id
                """).param("op", operation.name()).param("arquivo", filename).param("total", received, java.sql.Types.INTEGER)
                .param("actor", actor).param("status", status).param("msg", message).query(Long.class).single());
    }

    private static Upload mapUpload(ResultSet rs, int row) throws SQLException {
        return new Upload(rs.getLong("id"), rs.getString("tipo_operacao"), rs.getString("nome_arquivo"),
                Accounts.utc(rs, "data_hora"), rs.getString("status"), rs.getObject("linhas_lidas", Integer.class),
                rs.getString("mensagem"), rs.getString("enviado_por"), rs.getObject("linhas_importadas", Integer.class));
    }

    private static Client mapClient(ResultSet rs, int row) throws SQLException {
        Array sqlArray = rs.getArray("servicos");
        List<String> services;
        try {
            services = List.of((String[]) sqlArray.getArray());
        } finally {
            sqlArray.free();
        }
        return new Client(rs.getLong("id"), rs.getString("consultor"), rs.getString("codigo"), rs.getString("nome"),
                rs.getString("segmento"), rs.getString("nivel"), rs.getBigDecimal("faturamento_anual"),
                rs.getObject("data_inicio", LocalDate.class), String.join(", ", services), services,
                rs.getString("cidade"), rs.getString("uf"));
    }

    private static Failure clientMissing() {
        return new Failure(HttpStatus.NOT_FOUND, "Cliente não encontrado na carteira atual.");
    }
}
