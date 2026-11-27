package br.com.datapulse.ctiinsights;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class CarteiraController {
    private final CarteiraService carteira;

    CarteiraController(CarteiraService carteira) {
        this.carteira = carteira;
    }

    @GetMapping("/uploads")
    List<CarteiraService.Upload> uploads() {
        return carteira.listarEnvios();
    }

    @PostMapping("/uploads")
    ResponseEntity<CarteiraService.Upload> upload(@RequestBody ValidadorImportacao.Upload upload, @AuthenticationPrincipal Long usuarioId) {
        return respostaProcessamento(carteira.importar(upload, usuarioId), HttpStatus.CREATED);
    }

    @GetMapping("/clientes")
    List<CarteiraService.Client> clients() {
        return carteira.listarClientes();
    }

    @GetMapping("/clientes/{id}")
    CarteiraService.Client client(@PathVariable long id) {
        return carteira.buscarCliente(id);
    }

    @PostMapping("/clientes")
    ResponseEntity<CarteiraService.Upload> create(@RequestBody ValidadorImportacao.Input client, @AuthenticationPrincipal Long usuarioId) {
        return respostaProcessamento(carteira.alterarCarteira(CarteiraService.Operation.CRIACAO_CLIENTE, null, client, usuarioId), HttpStatus.CREATED);
    }

    @PutMapping("/clientes/{id}")
    ResponseEntity<CarteiraService.Upload> edit(@PathVariable long id, @RequestBody ValidadorImportacao.Input client,
                                          @AuthenticationPrincipal Long usuarioId) {
        return respostaProcessamento(carteira.alterarCarteira(CarteiraService.Operation.EDICAO_CLIENTE, id, client, usuarioId), HttpStatus.OK);
    }

    @DeleteMapping("/clientes/{id}")
    ResponseEntity<CarteiraService.Upload> delete(@PathVariable long id, @AuthenticationPrincipal Long usuarioId) {
        return respostaProcessamento(carteira.alterarCarteira(CarteiraService.Operation.EXCLUSAO_CLIENTE, id, null, usuarioId), HttpStatus.OK);
    }

    @GetMapping("/dashboard")
    CarteiraService.Dashboard dashboard() {
        return carteira.consultarDashboard();
    }

    private ResponseEntity<CarteiraService.Upload> respostaProcessamento(CarteiraService.Upload upload, HttpStatus success) {
        return ResponseEntity.status("NORMALIZADO".equals(upload.status()) ? success : HttpStatus.BAD_GATEWAY)
                .body(upload);
    }
}
