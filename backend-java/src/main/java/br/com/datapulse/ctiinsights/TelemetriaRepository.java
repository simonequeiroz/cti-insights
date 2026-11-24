package br.com.datapulse.ctiinsights;

import java.sql.Types;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
class TelemetriaRepository {
    private final JdbcClient jdbc;

    TelemetriaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // O FastAPI usa outra conexão e precisa encontrar o envio já confirmado no banco.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long registrar(String operacao, String arquivo, Integer linhas, long usuarioId,
                         String status, String mensagem) {
        return jdbc.sql("""
                INSERT INTO telemetria (tipo_operacao, nome_arquivo, linhas_lidas, usuario_id, status, mensagem)
                VALUES (:operacao, :arquivo, :linhas, :usuario, :status, :mensagem) RETURNING id
                """)
                .param("operacao", operacao)
                .param("arquivo", arquivo)
                .param("linhas", linhas, Types.INTEGER)
                .param("usuario", usuarioId)
                .param("status", status)
                .param("mensagem", mensagem)
                .query(Long.class).single();
    }
}
