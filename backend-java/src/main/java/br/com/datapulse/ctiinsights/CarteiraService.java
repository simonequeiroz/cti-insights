package br.com.datapulse.ctiinsights;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import br.com.datapulse.ctiinsights.model.*;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static br.com.datapulse.ctiinsights.ErrosApi.Failure;

@Service
class CarteiraService {
    record Upload(long id, String tipoOperacao, String nomeArquivo, Instant dataHora, String status,
                  Integer linhasLidas, String mensagem, String enviadoPor, Integer linhasImportadas) {}
    record Dashboard(Upload envio, Instant geradoEm, JsonNode estatisticas, List<String> insights) {}
    record Client(long id, String consultor, String codigo_cliente, String nome_cliente, String segmento,
                  String nivel_cliente, BigDecimal faturamento, LocalDate data_contratacao, String servico,
                  List<String> servicos, String cidade, String uf) {

        ValidadorImportacao.Row toRow() {
            return new ValidadorImportacao.Row(codigo_cliente, nome_cliente, consultor, segmento, nivel_cliente,
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
            SELECT c.*, co.nome AS consultor, ct.id AS contrato_id, ct.data_inicio,
                   ARRAY(SELECT s.id FROM contrato_servico cs JOIN servico s ON s.id = cs.servico_id
                         WHERE cs.contrato_id = ct.id ORDER BY s.nome, s.id) AS servico_ids,
                   ARRAY(SELECT s.nome FROM contrato_servico cs JOIN servico s ON s.id = cs.servico_id
                         WHERE cs.contrato_id = ct.id ORDER BY s.nome, s.id) AS servicos
            FROM cliente c LEFT JOIN consultor co ON co.id = c.consultor_id
            LEFT JOIN contrato ct ON ct.cliente_id = c.id
            WHERE c.telemetria_id = (
            """ + ACTIVE + ") ";

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final ValidadorImportacao validador;
    private final ClienteEtl etl;
    private final TelemetriaRepository telemetria;

    CarteiraService(JdbcClient jdbc, JsonMapper json, ValidadorImportacao validador, ClienteEtl etl,
              TelemetriaRepository telemetria) {
        this.jdbc = jdbc;
        this.json = json;
        this.validador = validador;
        this.etl = etl;
        this.telemetria = telemetria;
    }

    List<Upload> listarEnvios() {
        return jdbc.sql(UPLOADS + " ORDER BY t.id DESC").query(CarteiraService::mapUpload).list();
    }

    List<Client> listarClientes() {
        return jdbc.sql(CLIENTS + " ORDER BY c.nome, c.id").query(CarteiraService::mapClient).list();
    }

    Client buscarCliente(long id) {
        return jdbc.sql(CLIENTS + " AND c.id = ?").param(id).query(CarteiraService::mapClient).optional()
                .orElseThrow(CarteiraService::clienteNaoEncontrado);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dashboard consultarDashboard() {
        var upload = jdbc.sql(UPLOADS + " WHERE t.id = (" + ACTIVE + ")").query(CarteiraService::mapUpload)
                .optional().orElseThrow(() -> new Failure(HttpStatus.NOT_FOUND, "Nenhum envio normalizado."));
        var insights = jdbc.sql("SELECT id, telemetria_id, descricao FROM insight WHERE telemetria_id = ? ORDER BY id")
                .param(upload.id()).query((rs, row) -> new Insight(rs.getLong("id"), rs.getLong("telemetria_id"),
                        rs.getString("descricao"))).list().stream().map(Entidade::resumo).toList();
        return jdbc.sql("SELECT gerado_em, resultado FROM estatistica WHERE telemetria_id = ?")
                .param(upload.id()).query((rs, row) -> new Dashboard(upload, UsuarioService.utc(rs, "gerado_em"),
                        json.readTree(rs.getString("resultado")), insights))
                .optional().orElseThrow(() -> new Failure(HttpStatus.NOT_FOUND, "Estatísticas indisponíveis."));
    }

    @Transactional
    public Upload importar(ValidadorImportacao.Upload request, long usuarioId) {
        List<ValidadorImportacao.Row> rows;
        try {
            rows = validador.rows(request);
        } catch (Failure error) {
            var filename = request == null ? null : request.nomeArquivo();
            var count = request == null ? null : request.linhasLidas();
            telemetria.registrar(Operation.UPLOAD.name(), filename == null || filename.isBlank() ? "arquivo" : filename,
                    count == null || count < 0 ? null : count, usuarioId, "ERRO_SCHEMA", error.getMessage());
            throw error;
        }
        bloquearEscrita();
        return processar(Operation.UPLOAD, request.nomeArquivo().strip(), request.linhasLidas(), rows, usuarioId);
    }

    @Transactional
    public Upload alterarCarteira(Operation operation, Long id, ValidadorImportacao.Input input, long usuarioId) {
        bloquearEscrita();
        ValidadorImportacao.Row replacement = operation == Operation.EXCLUSAO_CLIENTE ? null : validador.row(input);
        var carteiraAtual = listarClientes();
        if (id != null && carteiraAtual.stream().noneMatch(cliente -> cliente.id() == id)) {
            throw clienteNaoEncontrado();
        }
        var rows = new ArrayList<ValidadorImportacao.Row>();
        for (Client client : carteiraAtual) {
            if (id != null && client.id() == id) {
                continue;
            }
            if (replacement != null && client.codigo_cliente().equals(replacement.codigo_cliente())) {
                throw new ClienteDuplicadoException(HttpStatus.CONFLICT, "Código de cliente já existe na carteira.");
            }
            rows.add(client.toRow());
        }
        if (replacement != null) {
            rows.add(replacement);
        }
        return processar(operation, "Alteração manual da carteira", rows.size(), rows, usuarioId);
    }

    // Serializa uploads e edições para que duas revisões não partam da mesma carteira.
    private void bloquearEscrita() {
        if (!jdbc.sql("SELECT pg_try_advisory_xact_lock(91376, 1)").query(Boolean.class).single()) {
            throw new Failure(HttpStatus.CONFLICT, "A carteira está sendo processada. Tente novamente.");
        }
    }

    private Upload processar(Operation operation, String filename, int received, List<ValidadorImportacao.Row> rows, long usuarioId) {
        long id = telemetria.registrar(operation.name(), filename, received, usuarioId, "PROCESSANDO", "");
        boolean ok = etl.processar(id, received, rows);
        jdbc.sql("""
                UPDATE telemetria SET status = 'ERRO_ETL', mensagem = ? WHERE id = ? AND status = 'PROCESSANDO'
                """).params(ok ? "O ETL respondeu sem confirmar a gravação." : "Não foi possível concluir o ETL.", id)
                .update();
        return jdbc.sql(UPLOADS + " WHERE t.id = ?").param(id).query(CarteiraService::mapUpload).single();
    }

    private static Upload mapUpload(ResultSet rs, int row) throws SQLException {
        var t = new Telemetria(rs.getLong("id"), rs.getString("tipo_operacao"), rs.getString("nome_arquivo"),
                UsuarioService.utc(rs, "data_hora"), rs.getString("status"), rs.getObject("linhas_lidas", Integer.class),
                rs.getString("mensagem"), rs.getString("enviado_por"), rs.getObject("linhas_importadas", Integer.class));
        return new Upload(t.getId(), t.getTipoOperacao(), t.getNomeArquivo(), t.getDataHora(), t.getStatus(),
                t.getLinhasLidas(), t.getMensagem(), t.getEnviadoPor(), t.getLinhasImportadas());
    }

    private static Client mapClient(ResultSet rs, int row) throws SQLException {
        Array sqlArray = rs.getArray("servicos");
        Array idArray = rs.getArray("servico_ids");
        List<Servico> servicos = new ArrayList<>();
        try {
            String[] nomes = (String[]) sqlArray.getArray();
            Object[] ids = (Object[]) idArray.getArray();
            for (int i = 0; i < nomes.length; i++) servicos.add(new Servico(((Number) ids[i]).longValue(), nomes[i]));
        } finally {
            sqlArray.free();
            idArray.free();
        }
        Long contratoId = rs.getObject("contrato_id", Long.class);
        Long consultorId = rs.getObject("consultor_id", Long.class);
        var contrato = contratoId == null ? null : new Contrato(contratoId, rs.getObject("data_inicio", LocalDate.class), servicos);
        var consultor = consultorId == null ? null : new Consultor(consultorId, rs.getString("consultor"));
        var cliente = new Cliente(rs.getLong("id"), consultor, rs.getString("codigo"), rs.getString("nome"),
                rs.getString("segmento"), rs.getString("nivel"), rs.getBigDecimal("faturamento_anual"),
                contrato, rs.getString("cidade"), rs.getString("uf"));
        var services = contrato == null ? List.<String>of() : cliente.getContrato().getServicos().stream().map(Entidade::resumo).toList();
        return new Client(cliente.getId(), consultor == null ? null : cliente.getConsultor().resumo(),
                cliente.getCodigo(), cliente.getNome(), cliente.getSegmento(), cliente.getNivel(), cliente.getFaturamento(),
                contrato == null ? null : contrato.getDataInicio(), String.join(", ", services), services, cliente.getCidade(), cliente.getUf());
    }

    private static Failure clienteNaoEncontrado() {
        return new Failure(HttpStatus.NOT_FOUND, "Cliente não encontrado na carteira atual.");
    }
}
