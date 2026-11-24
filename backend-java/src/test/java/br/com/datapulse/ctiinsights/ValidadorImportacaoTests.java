package br.com.datapulse.ctiinsights;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.*;

class ValidadorImportacaoTests {
    private static final ValidatorFactory VALIDATORS = Validation.buildDefaultValidatorFactory();
    private static final JsonMapper JSON = new JsonMapper();
    private final ValidadorImportacao validation = new ValidadorImportacao(VALIDATORS.getValidator());

    @AfterAll
    static void closeValidators() {
        VALIDATORS.close();
    }

    @Test
    void normalizesBrazilianFormattingAndOptionalUf() {
        var row = validation.row(line(" c001 ", "\"R$ 1.850.000,00\"", "29/02/2024", "sp", "MPLS; ;Firewall"));
        assertThat(row.codigo_cliente()).isEqualTo("C001");
        assertThat(row.faturamento_anual()).isEqualByComparingTo(new BigDecimal("1850000.00"));
        assertThat(row.data_contratacao()).isEqualTo("2024-02-29");
        assertThat(row.servicos_contratados()).isEqualTo("MPLS;Firewall");
        assertThat(row.uf()).isEqualTo("SP");
        assertThat(validation.row(line("C1", "1850000.05", "2024-02-29", "", "MPLS")).faturamento_anual())
                .isEqualByComparingTo("1850000.05");
    }

    @Test
    void rejectsNegativeOrOverflowingMoneyInvalidDateUfAndServices() {
        assertThatThrownBy(() -> validation.row(line("C1", "-0.01", "2024-05-01", "", "MPLS")))
                .hasMessageContaining("faturamento");
        assertThatThrownBy(() -> validation.row(line("C1", "9999999999999.999", "2024-05-01", "", "MPLS")))
                .hasMessageContaining("faturamento");
        assertThatThrownBy(() -> validation.row(line("C1", "0", "31/02/2024", "", "MPLS")))
                .hasMessageContaining("data");
        assertThatThrownBy(() -> validation.row(line("C1", "0", "2024-05-01", "S1", "MPLS")))
                .hasMessageContaining("UF");
        assertThatThrownBy(() -> validation.row(line("C1", "0", "2024-05-01", "SP", "; ")))
                .hasMessageContaining("serviço");
    }

    @Test
    void rejectsDuplicateOrMissingRows() {
        var first = line("C1", "0", "2024-05-01", "", "MPLS");
        var duplicate = line(" c1 ", "0", "2024-05-01", "", "MPLS");
        assertThatThrownBy(() -> validation.rows(new ValidadorImportacao.Upload("carteira.xlsx", 3, List.of(first, duplicate))))
                .hasMessageContaining("Linha enviada 2").hasMessageContaining("duplicado");
        assertThatThrownBy(() -> validation.rows(new ValidadorImportacao.Upload("carteira.xlsx", 2, Arrays.asList(first, null))))
                .hasMessageContaining("Linha enviada 2");
    }

    private static ValidadorImportacao.Input line(String code, String money, String date, String uf, String services) {
        return new ValidadorImportacao.Input(code, "Cliente Teste", "Consultor Teste", "Indústria", "a",
                JSON.readTree(money), date, services, null, uf);
    }
}
