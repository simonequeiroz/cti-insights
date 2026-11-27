package br.com.datapulse.ctiinsights.model;

import java.util.Objects;

public final class Insight extends Entidade {
    private final long telemetriaId;
    private final String descricao;
    public Insight(long id, long telemetriaId, String descricao) {
        super(id);
        this.telemetriaId = telemetriaId;
        this.descricao = Objects.requireNonNull(descricao);
    }
    public long getTelemetriaId() { return telemetriaId; }
    public String getDescricao() { return descricao; }
    @Override public String resumo() { return descricao; }
}
