package com.builderconnect.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.List;

/**
 * OpenAPI/Swagger configuration for API documentation.
 */
@Configuration
@Profile("dev")
public class OpenApiConfig {

    @Value("${app.name}")
    private String appName;

    @Value("${app.version}")
    private String appVersion;

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
            .info(new Info()
                .title(appName + " API")
                .version(appVersion)
                .description("""
                    BuilderConnect v2 - Smart Construction Marketplace & Project Lifecycle Management Platform API.

                    ## Overview
                    This API provides endpoints for managing:
                    - User authentication and authorization
                    - Projects and bidding
                    - Milestones
                    - Real-time chat
                    - Material orders and suppliers
                    - Reviews and ratings
                    - Admin operations

                    ## Authentication
                    Most endpoints require JWT Bearer token authentication.
                    Use the `/v1/auth/login` endpoint to obtain a token.

                    ## Rate Limiting
                    API requests are limited to 100 requests per minute per IP.
                    """)
                .contact(new Contact()
                    .name("BuilderConnect Support")
                    .email("support@builderconnect.pk")
                    .url("https://builderconnect.pk"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:8080/api")
                    .description("Local Development Server"),
                new Server()
                    .url("https://api.builderconnect.pk")
                    .description("Production Server")))
            .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
            .components(new Components()
                .addSecuritySchemes(securitySchemeName,
                    new SecurityScheme()
                        .name(securitySchemeName)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Enter JWT Bearer token")));
    }
}
