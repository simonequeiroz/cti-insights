package br.com.datapulse.ctiinsights.model;

public abstract class Entidade {
    private final long id;
    protected Entidade(long id) {
        if (id <= 0) throw new IllegalArgumentException("ID deve ser positivo.");
        this.id = id;
    }
    public final long getId() { return id; }
    public abstract String resumo();
}
