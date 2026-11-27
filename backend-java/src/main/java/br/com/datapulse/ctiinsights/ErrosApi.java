package br.com.datapulse.ctiinsights;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
class ErrosApi {
    static class Failure extends RuntimeException {
        final HttpStatus status;
        final String code;

        Failure(HttpStatus status, String message) {
            this(status, message, null);
        }

        Failure(HttpStatus status, String message, String code) {
            super(message);
            this.status = status;
            this.code = code;
        }
    }

    @ExceptionHandler({ExcelInvalidoException.class, ColunaObrigatoriaException.class, ClienteDuplicadoException.class})
    ResponseEntity<Map<String, String>> handleImportacao(Failure error) {
        return handle(error);
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<Map<String, String>> handle(Failure error) {
        var body = new LinkedHashMap<String, String>();
        body.put("mensagem", error.getMessage());
        if (error.code != null) {
            body.put("codigo", error.code);
        }
        return ResponseEntity.status(error.status).body(body);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String, String>> invalid() {
        return handle(new Failure(HttpStatus.BAD_REQUEST, "Requisição inválida."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> conflict() {
        return handle(new Failure(HttpStatus.CONFLICT, "Os dados conflitam com um registro existente."));
    }
}
