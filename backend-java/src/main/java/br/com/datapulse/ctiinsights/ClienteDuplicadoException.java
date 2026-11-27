package br.com.datapulse.ctiinsights;

import org.springframework.http.HttpStatus;

public class ClienteDuplicadoException extends ErrosApi.Failure {
    public ClienteDuplicadoException(HttpStatus status, String mensagem) {
        super(status, mensagem, "CLIENTE_DUPLICADO");
    }
}
