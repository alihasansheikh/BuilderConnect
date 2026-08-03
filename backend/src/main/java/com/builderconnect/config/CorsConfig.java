package com.builderconnect.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS configuration for cross-origin requests.
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:5174}")
    private String allowedOriginsStr;

    @Value("${app.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Parse allowed origins from comma-separated string or use defaults
        List<String> allowedOrigins = Arrays.asList(allowedOriginsStr.split(","));
        configuration.setAllowedOrigins(allowedOrigins);

        // Set default allowed methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allow all headers
        configuration.setAllowedHeaders(Arrays.asList("*"));

        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(maxAge);
        configuration.setExposedHeaders(List.of(
            "Authorization",
            "Content-Disposition",
            "X-Total-Count",
            "X-Page-Number",
            "X-Page-Size"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
