package br.com.datapulse.ctiinsights.model;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public final class Contrato extends Entidade {
    private final LocalDate dataInicio;
    private final List<Servico> servicos;
    public Contrato(long id, LocalDate dataInicio, List<Servico> servicos) {
        super(id);
        this.dataInicio = Objects.requireNonNull(dataInicio);
        this.servicos = List.copyOf(servicos);
    }
    public LocalDate getDataInicio() { return dataInicio; }
    public List<Servico> getServicos() { return servicos; }
    @Override public String resumo() { return "Contrato " + getId() + " — " + servicos.size() + " serviço(s)"; }
}
