package com.builderconnect.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Stripe API credentials (app.stripe.* in application.yml, sourced from
 * STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET in the gitignored backend/.env
 * via spring-dotenv). Blank defaults keep dev bootable without keys —
 * StripeService guards every public method with {@link #isConfigured()}.
 */
@Component
@ConfigurationProperties(prefix = "app.stripe")
@Getter
@Setter
public class StripeProperties {

    private String secretKey = "";

    private String webhookSecret = "";

    public boolean isConfigured() {
        return secretKey != null && !secretKey.isBlank();
    }
}
