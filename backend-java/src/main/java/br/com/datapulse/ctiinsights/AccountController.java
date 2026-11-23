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
class AccountController {
    private final Accounts accounts;

    AccountController(Accounts accounts) {
        this.accounts = accounts;
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
    Map<String, String> login(@RequestBody Accounts.Credentials credentials, HttpServletRequest request) {
        var account = accounts.authenticate(credentials);
        var previous = request.getSession(false);
        if (previous != null) {
            previous.invalidate();
        }
        request.getSession().setAttribute(SecurityConfig.ACCOUNT_ID, account.id());
        return Map.of("email", account.email(), "nome", account.nome(), "papel", account.papel().name());
    }

    @PostMapping("/auth/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    Accounts.Account register(@RequestBody Accounts.Registration registration) {
        return accounts.register(registration);
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request) {
        request.getSession().invalidate();
    }

    @GetMapping("/usuarios")
    List<Accounts.Account> list() {
        return accounts.list();
    }

    @PatchMapping("/usuarios/{id}")
    Accounts.Account review(@PathVariable long id, @RequestBody Accounts.Review review,
                            @AuthenticationPrincipal Long reviewer) {
        return accounts.review(id, review, reviewer);
    }
}
