package com.builderconnect.config;

import com.builderconnect.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration for the application.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final UserDetailsService userDetailsService;

    @Value("${springdoc.swagger-ui.enabled:true}")
    private boolean swaggerEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configure(http))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())
                .contentTypeOptions(content -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
            )
            .authorizeHttpRequests(auth -> {
                // Public endpoints
                auth.requestMatchers("/v1/auth/**").permitAll()
                .requestMatchers("/v1/public/**").permitAll();

                // Swagger paths only permitted when enabled (disabled in prod profile)
                if (swaggerEnabled) {
                    auth.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                }

                auth.requestMatchers("/ws/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/uploads/**").permitAll()

                // Stripe webhook: no JWT — the Stripe-Signature verification in
                // StripeService is the auth (bad signature -> 400)
                .requestMatchers(HttpMethod.POST, "/v1/webhooks/stripe").permitAll()

                // Public read access for builders, categories, materials, and badges
                .requestMatchers(HttpMethod.GET, "/v1/builders/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/materials/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/badges/**").permitAll()

                // Client endpoints
                .requestMatchers("/v1/client/**").hasAnyRole("CLIENT", "ADMIN", "SUPER_ADMIN")

                // Builder endpoints
                .requestMatchers("/v1/builder/**").hasAnyRole("BUILDER", "ADMIN", "SUPER_ADMIN")

                // Supplier endpoints
                .requestMatchers("/v1/supplier/**").hasAnyRole("SUPPLIER", "ADMIN", "SUPER_ADMIN")

                // Support ticket endpoints are secured per-method via @PreAuthorize:
                // any authenticated user manages their OWN tickets (isAuthenticated),
                // while assign/status/resolve require SUPPORT_AGENT/ADMIN/SUPER_ADMIN.
                // No blanket /v1/support/** rule — it would 403 users on their own tickets.

                // Admin endpoints
                .requestMatchers("/v1/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN")

                // Super Admin endpoints
                .requestMatchers("/v1/super-admin/**").hasRole("SUPER_ADMIN")

                // Authenticated AI Assistant — clients and builders only
                .requestMatchers("/v1/assistant/**").hasAnyRole("CLIENT", "BUILDER")

                // Floor Plan Studio — clients and builders only
                .requestMatchers("/v1/floorplan/**").hasAnyRole("CLIENT", "BUILDER")

                // All other requests require authentication
                .anyRequest().authenticated();
            })
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
