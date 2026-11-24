package br.com.datapulse.ctiinsights;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class UsuarioController {
    private final UsuarioService usuarios;

    UsuarioController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/auth/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/auth/login")
    Map<String, String> login(@RequestBody UsuarioService.Credentials credentials, HttpServletRequest request) {
        var account = usuarios.autenticar(credentials);
        var previous = request.getSession(false);
        if (previous != null) {
            previous.invalidate();
        }
        request.getSession().setAttribute(SecurityConfig.USUARIO_ID, account.id());
        return Map.of("email", account.email(), "nome", account.nome(), "papel", account.papel().name());
    }

    @PostMapping("/auth/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    UsuarioService.Account register(@RequestBody UsuarioService.Registration registration) {
        return usuarios.cadastrar(registration);
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request) {
        request.getSession().invalidate();
    }

    @GetMapping("/usuarios")
    List<UsuarioService.Account> list() {
        return usuarios.listar();
    }

    @PatchMapping("/usuarios/{id}")
    UsuarioService.Account review(@PathVariable long id, @RequestBody UsuarioService.Review review,
                            @AuthenticationPrincipal Long reviewer) {
        return usuarios.avaliar(id, review, reviewer);
    }
}
