package com.builderconnect.controller;

import com.builderconnect.service.StripeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Inbound Stripe webhooks. permitAll at the URL level (SecurityConfig) and
 * exempt from rate limiting (RateLimitFilter) — the Stripe-Signature
 * verification inside StripeService is the auth substitute.
 * The raw {@code @RequestBody String} payload is preserved byte-for-byte
 * for signature verification.
 */
@RestController
@RequestMapping("/v1/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Inbound payment-provider webhooks")
public class StripeWebhookController {

    private final StripeService stripeService;

    @PostMapping("/stripe")
    @Operation(summary = "Handle a signature-verified Stripe webhook event")
    public ResponseEntity<Void> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String signature) {
        stripeService.handleWebhookEvent(payload, signature);
        return ResponseEntity.ok().build();
    }
}
