package br.com.datapulse.ctiinsights;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class PortfolioController {
    private final Portfolio portfolio;

    PortfolioController(Portfolio portfolio) {
        this.portfolio = portfolio;
    }

    @GetMapping("/uploads")
    List<Portfolio.Upload> uploads() {
        return portfolio.uploads();
    }

    @PostMapping("/uploads")
    ResponseEntity<Portfolio.Upload> upload(@RequestBody ImportData.Upload upload, @AuthenticationPrincipal Long actor) {
        return outcome(portfolio.upload(upload, actor), HttpStatus.CREATED);
    }

    @GetMapping("/clientes")
    List<Portfolio.Client> clients() {
        return portfolio.clients();
    }

    @GetMapping("/clientes/{id}")
    Portfolio.Client client(@PathVariable long id) {
        return portfolio.client(id);
    }

    @PostMapping("/clientes")
    ResponseEntity<Portfolio.Upload> create(@RequestBody ImportData.Input client, @AuthenticationPrincipal Long actor) {
        return outcome(portfolio.change(Portfolio.Operation.CRIACAO_CLIENTE, null, client, actor), HttpStatus.CREATED);
    }

    @PutMapping("/clientes/{id}")
    ResponseEntity<Portfolio.Upload> edit(@PathVariable long id, @RequestBody ImportData.Input client,
                                          @AuthenticationPrincipal Long actor) {
        return outcome(portfolio.change(Portfolio.Operation.EDICAO_CLIENTE, id, client, actor), HttpStatus.OK);
    }

    @DeleteMapping("/clientes/{id}")
    ResponseEntity<Portfolio.Upload> delete(@PathVariable long id, @AuthenticationPrincipal Long actor) {
        return outcome(portfolio.change(Portfolio.Operation.EXCLUSAO_CLIENTE, id, null, actor), HttpStatus.OK);
    }

    @GetMapping("/dashboard")
    Portfolio.Dashboard dashboard() {
        return portfolio.dashboard();
    }

    private ResponseEntity<Portfolio.Upload> outcome(Portfolio.Upload upload, HttpStatus success) {
        return ResponseEntity.status("NORMALIZADO".equals(upload.status()) ? success : HttpStatus.BAD_GATEWAY)
                .body(upload);
    }
}
