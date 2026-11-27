package br.com.datapulse.ctiinsights.model;

import java.math.BigDecimal;
import java.util.Objects;

public final class Cliente extends Entidade {
    private final Consultor consultor;
    private final String codigo, nome, segmento, nivel, cidade, uf;
    private final BigDecimal faturamento;
    private final Contrato contrato;
    public Cliente(long id, Consultor consultor, String codigo, String nome, String segmento,
                   String nivel, BigDecimal faturamento, Contrato contrato, String cidade, String uf) {
        super(id);
        this.consultor = consultor;
        this.codigo = Objects.requireNonNull(codigo);
        this.nome = Objects.requireNonNull(nome);
        this.segmento = segmento;
        this.nivel = nivel;
        this.faturamento = Objects.requireNonNull(faturamento);
        this.contrato = contrato;
        this.cidade = cidade;
        this.uf = uf;
    }
    public Consultor getConsultor() { return consultor; }
    public String getCodigo() { return codigo; }
    public String getNome() { return nome; }
    public String getSegmento() { return segmento; }
    public String getNivel() { return nivel; }
    public BigDecimal getFaturamento() { return faturamento; }
    public Contrato getContrato() { return contrato; }
    public String getCidade() { return cidade; }
    public String getUf() { return uf; }
    @Override public String resumo() { return codigo + " — " + nome; }
}
