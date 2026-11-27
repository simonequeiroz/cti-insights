package br.com.datapulse.ctiinsights;

import br.com.datapulse.ctiinsights.model.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DominioTests {
    @Test void encapsulamentoComposicaoEPolimorfismo() {
        var servico = new Servico(1, "Firewall");
        var consultor = new Consultor(2, "Ana");
        var lista = new ArrayList<>(List.of(servico));
        var contrato = new Contrato(3, LocalDate.of(2025, 1, 1), lista);
        lista.clear();
        var cliente = new Cliente(4, consultor, "C01", "Alfa", "Indústria", "A",
                BigDecimal.TEN, contrato, "Campinas", "SP");
        var insight = new Insight(5, 6, "Oportunidade");
        var telemetria = new Telemetria(6, "UPLOAD", "teste.xlsx", Instant.EPOCH,
                "NORMALIZADO", 1, "", "Ana", 1);
        List<Entidade> entidades = List.of(cliente, consultor, servico, contrato, insight, telemetria);
        assertThat(entidades.stream().map(Entidade::resumo).toList())
                .containsExactly("C01 — Alfa", "Ana", "Firewall", "Contrato 3 — 1 serviço(s)", "Oportunidade", "UPLOAD — NORMALIZADO");
        assertThat(cliente.getContrato().getServicos()).containsExactly(servico);
        assertThat(cliente.getConsultor()).isSameAs(consultor);
        assertThatThrownBy(() -> contrato.getServicos().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
}
