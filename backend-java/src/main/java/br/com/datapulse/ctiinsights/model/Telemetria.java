package br.com.datapulse.ctiinsights.model;

import java.time.Instant;

public final class Telemetria extends Entidade {
    private final String tipoOperacao, nomeArquivo, status, mensagem, enviadoPor;
    private final Instant dataHora;
    private final Integer linhasLidas, linhasImportadas;
    public Telemetria(long id, String tipoOperacao, String nomeArquivo, Instant dataHora, String status,
                      Integer linhasLidas, String mensagem, String enviadoPor, Integer linhasImportadas) {
        super(id);
        this.tipoOperacao = tipoOperacao;
        this.nomeArquivo = nomeArquivo;
        this.dataHora = dataHora;
        this.status = status;
        this.linhasLidas = linhasLidas;
        this.mensagem = mensagem;
        this.enviadoPor = enviadoPor;
        this.linhasImportadas = linhasImportadas;
    }
    public String getTipoOperacao() { return tipoOperacao; }
    public String getNomeArquivo() { return nomeArquivo; }
    public Instant getDataHora() { return dataHora; }
    public String getStatus() { return status; }
    public Integer getLinhasLidas() { return linhasLidas; }
    public String getMensagem() { return mensagem; }
    public String getEnviadoPor() { return enviadoPor; }
    public Integer getLinhasImportadas() { return linhasImportadas; }
    @Override public String resumo() { return tipoOperacao + " — " + status; }
}
