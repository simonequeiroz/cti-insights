package br.com.datapulse.ctiinsights;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
class SecurityConfig {
    static final String USUARIO_ID = "cti.usuarioId";

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, UsuarioService usuarios) {
        return http
                .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
                .requestCache(cache -> cache.disable())
                .logout(logout -> logout.disable())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, error) ->
                                error(response, 401, "Autenticação necessária."))
                        .accessDeniedHandler((request, response, error) ->
                                error(response, 403, "Acesso negado.")))
                .addFilterBefore(new IdentidadeDaSessao(usuarios), AuthorizationFilter.class)
                .authorizeHttpRequests(routes -> routes
                        // Sem isto, o denyAll abaixo bloqueia o /error do Spring e um erro 500
                        // chega ao cliente como 401/403.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health", "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/cadastro").permitAll()
                        .requestMatchers("/api/usuarios", "/api/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/uploads").hasAnyRole("CONSULTOR", "ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/clientes").hasAnyRole("CONSULTOR", "ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/clientes/*").hasAnyRole("CONSULTOR", "ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/clientes/*").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/clientes", "/api/clientes/*", "/api/dashboard").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout", "/api/auth/senha").authenticated()
                        .anyRequest().denyAll())
                .build();
    }

    private static void error(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"mensagem\":\"" + message + "\"}");
    }

    private static class IdentidadeDaSessao extends OncePerRequestFilter {
        private final UsuarioService usuarios;

        IdentidadeDaSessao(UsuarioService usuarios) {
            this.usuarios = usuarios;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                        FilterChain chain) throws ServletException, IOException {
            var session = request.getSession(false);
            if (session != null && session.getAttribute(USUARIO_ID) instanceof Long id) {
                var papel = usuarios.papelAprovado(id);
                if (papel == null) {
                    session.invalidate();
                } else {
                    var role = new SimpleGrantedAuthority("ROLE_" + papel);
                    var context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(id, null, List.of(role)));
                    SecurityContextHolder.setContext(context);
                }
            }
            chain.doFilter(request, response);
        }
    }
}
