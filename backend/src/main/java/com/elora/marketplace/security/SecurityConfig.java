package com.elora.marketplace.security;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    @Value("${elora.cors.allowed-origins:http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080}")
    private String allowedOrigins;

    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(c -> c.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/index.html", "/*.html", "/css/**", "/js/**", "/assets/**", "/favicon.ico", "/error", "/api/auth/**", "/h2-console/**").permitAll()
                // rotas "mine" precisam vir antes das regras genéricas de GET, senão ficariam públicas
                .requestMatchers(HttpMethod.GET, "/api/products/mine", "/api/services/mine", "/api/orders/mine").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/projects/mine", "/api/proposals/mine").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/projects", "/api/projects/*").permitAll()
                .requestMatchers("/api/users/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/users/*/products", "/api/users/*/services", "/api/users/*/reviews").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/*/portfolio").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/*", "/api/reviews/user/*", "/api/reviews/user/*/summary").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/reviews/user/*/services").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/services/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/*/questions", "/api/services/*/questions").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(h -> h.frameOptions(f -> f.sameOrigin()));
        return http.build();
    }
    @Bean CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
