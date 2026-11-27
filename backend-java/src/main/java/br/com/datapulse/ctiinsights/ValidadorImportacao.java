package br.com.datapulse.ctiinsights;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

import static br.com.datapulse.ctiinsights.ErrosApi.Failure;

@Component
class ValidadorImportacao {
    record Upload(String nomeArquivo, Integer linhasLidas, List<Input> linhas) {}
    record Input(@NotBlank @Size(max = 50) String codigo_cliente,
                 @NotBlank @Size(max = 200) String nome_cliente,
                 @NotBlank @Size(max = 150) String consultor,
                 @NotBlank @Size(max = 80) String segmento,
                 String nivel_cliente, JsonNode faturamento_anual, String data_contratacao,
                 String servicos_contratados, @Size(max = 100) String cidade, String uf) {}
    record Row(String codigo_cliente, String nome_cliente, String consultor, String segmento,
               String nivel_cliente, BigDecimal faturamento_anual, String data_contratacao,
               String servicos_contratados, String cidade, String uf) {}

    private final Validator validator;
    private static final DateTimeFormatter BR_DATE =
            DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT);

    ValidadorImportacao(Validator validator) {
        this.validator = validator;
    }

    List<Row> rows(Upload upload) {
        if (upload == null || upload.nomeArquivo() == null || upload.nomeArquivo().isBlank() || upload.linhas() == null
                || upload.linhas().isEmpty() || upload.linhasLidas() == null
                || upload.linhasLidas() < upload.linhas().size()) {
            throw new ExcelInvalidoException("Informe o arquivo, as linhas válidas e o total de linhas lidas.");
        }
        var codes = new HashSet<String>();
        var result = new ArrayList<Row>();
        for (int i = 0; i < upload.linhas().size(); i++) {
            try {
                Row row = row(upload.linhas().get(i));
                if (!codes.add(row.codigo_cliente())) {
                    throw new ClienteDuplicadoException(HttpStatus.BAD_REQUEST, "Código de cliente duplicado.");
                }
                result.add(row);
            } catch (ClienteDuplicadoException error) {
                throw new ClienteDuplicadoException(HttpStatus.BAD_REQUEST, "Linha enviada " + (i + 1) + ": " + error.getMessage());
            } catch (ColunaObrigatoriaException error) {
                throw new ColunaObrigatoriaException("Linha enviada " + (i + 1) + ": " + error.getMessage());
            } catch (Failure error) {
                throw new ExcelInvalidoException("Linha enviada " + (i + 1) + ": " + error.getMessage());
            }
        }
        return result;
    }

    Row row(Input input) {
        if (input == null) {
            throw invalid("Linha de cliente ausente.");
        }
        String code = clean(input.codigo_cliente()).toUpperCase(Locale.ROOT);
        String city = clean(input.cidade());
        String uf = clean(input.uf()).toUpperCase(Locale.ROOT);
        String level = clean(input.nivel_cliente()).toUpperCase(Locale.ROOT);
        String services = clean(input.servicos_contratados());
        var normalized = new Input(code, clean(input.nome_cliente()), clean(input.consultor()),
                clean(input.segmento()), level, input.faturamento_anual(),
                clean(input.data_contratacao()), services, city, uf);
        var obrigatorias = new ArrayList<String>();
        if (code.isEmpty()) obrigatorias.add("codigo_cliente");
        if (normalized.nome_cliente().isEmpty()) obrigatorias.add("nome_cliente");
        if (normalized.consultor().isEmpty()) obrigatorias.add("consultor");
        if (normalized.segmento().isEmpty()) obrigatorias.add("segmento");
        if (level.isEmpty()) obrigatorias.add("nivel_cliente");
        if (normalized.faturamento_anual() == null || normalized.faturamento_anual().isNull()
                || (normalized.faturamento_anual().isTextual() && normalized.faturamento_anual().asString().isBlank()))
            obrigatorias.add("faturamento_anual");
        if (normalized.data_contratacao().isEmpty()) obrigatorias.add("data_contratacao");
        if (services.isEmpty()) obrigatorias.add("servicos_contratados");
        if (!obrigatorias.isEmpty()) {
            throw new ColunaObrigatoriaException("Campos obrigatórios ausentes: " + String.join(", ", obrigatorias) + ".");
        }
        var fields = validator.validate(normalized).stream()
                .map(v -> v.getPropertyPath().toString()).sorted().toList();
        if (!fields.isEmpty()) {
            throw invalid("Campos obrigatórios ou acima do tamanho do banco: " + String.join(", ", fields) + ".");
        }
        if (!level.matches("[ABC]") || (!uf.isEmpty() && !uf.matches("[A-Z]{2}"))) {
            throw invalid("Informe nível A, B ou C e, se preenchida, UF com duas letras.");
        }
        var serviceNames = java.util.Arrays.stream(services.split(";")).map(ValidadorImportacao::clean)
                .filter(name -> !name.isEmpty()).toList();
        if (serviceNames.isEmpty() || serviceNames.stream().anyMatch(name -> name.length() > 100)) {
            throw invalid("Informe ao menos um serviço com até 100 caracteres.");
        }
        return new Row(code, normalized.nome_cliente(), normalized.consultor(), normalized.segmento(),
                level, money(normalized.faturamento_anual()), date(normalized.data_contratacao()),
                String.join(";", serviceNames), city, uf);
    }

    private static BigDecimal money(JsonNode amount) {
        try {
            if (amount == null || (!amount.isNumber() && !amount.isTextual())) {
                throw new NumberFormatException();
            }
            BigDecimal number = amount.isNumber() ? amount.decimalValue() : parseMoney(amount.asString());
            if (number.signum() < 0 || number.compareTo(new BigDecimal("10000000000000")) >= 0) {
                throw new NumberFormatException();
            }
            // Evita escalar expoentes extremos que representam valores menores que meio centavo.
            var rounded = number.compareTo(new BigDecimal("0.005")) < 0
                    ? new BigDecimal("0.00") : number.setScale(2, RoundingMode.HALF_UP);
            if (rounded.precision() > 15) {
                throw new NumberFormatException();
            }
            return rounded;
        } catch (NumberFormatException | ArithmeticException ex) {
            throw invalid("Informe faturamento não negativo e dentro do limite NUMERIC(15,2).");
        }
    }

    private static BigDecimal parseMoney(String text) {
        String value = text.replaceFirst("(?i)^\\s*R\\$", "").replaceAll("[\\s\\p{Z}]", "");
        if (value.matches("-?[0-9]{1,3}(\\.[0-9]{3})+(,[0-9]+)?")) {
            return new BigDecimal(value.replace(".", "").replace(',', '.'));
        }
        if (value.matches("-?[0-9]{1,3}(,[0-9]{3}){2,}|-?[0-9]{1,3}(,[0-9]{3})+\\.[0-9]+")) {
            return new BigDecimal(value.replace(",", ""));
        }
        if (!value.matches("-?[0-9]+([.,][0-9]+)?")) {
            throw new NumberFormatException();
        }
        return new BigDecimal(value.replace(',', '.'));
    }

    private static String date(String date) {
        try {
            LocalDate parsed = LocalDate.parse(date, date.contains("/") ? BR_DATE : DateTimeFormatter.ISO_LOCAL_DATE);
            if (parsed.getYear() < 1 || parsed.getYear() > 9999) {
                throw invalid("Informe uma data de contratação válida.");
            }
            return parsed.toString();
        } catch (DateTimeParseException ex) {
            throw invalid("Informe uma data de contratação válida.");
        }
    }

    private static String clean(String value) {
        return value == null ? "" : value.replaceAll("[\\s\\p{Z}]+", " ").strip();
    }

    private static Failure invalid(String message) {
        return new Failure(HttpStatus.BAD_REQUEST, message);
    }
}
