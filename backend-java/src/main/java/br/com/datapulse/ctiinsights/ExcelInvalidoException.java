package br.com.datapulse.ctiinsights;

import org.springframework.http.HttpStatus;

public class ExcelInvalidoException extends ErrosApi.Failure {
    public ExcelInvalidoException(String mensagem) {
        super(HttpStatus.BAD_REQUEST, mensagem, "EXCEL_INVALIDO");
    }
}
