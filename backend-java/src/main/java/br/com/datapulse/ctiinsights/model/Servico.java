package br.com.datapulse.ctiinsights.model;

import java.util.Objects;

public final class Servico extends Entidade {
    private final String nome;
    public Servico(long id, String nome) {
        super(id);
        this.nome = Objects.requireNonNull(nome);
    }
    public String getNome() { return nome; }
    @Override public String resumo() { return nome; }
}
