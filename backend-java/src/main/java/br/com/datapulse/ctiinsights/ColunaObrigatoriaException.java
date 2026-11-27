package br.com.datapulse.ctiinsights;

import org.springframework.http.HttpStatus;

public class ColunaObrigatoriaException extends ErrosApi.Failure {
    public ColunaObrigatoriaException(String mensagem) {
        super(HttpStatus.BAD_REQUEST, mensagem, "COLUNA_OBRIGATORIA");
    }
}
