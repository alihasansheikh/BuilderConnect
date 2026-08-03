package com.builderconnect.controller;

import com.builderconnect.dto.response.SubscriptionPlanResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.StripeService;
import com.builderconnect.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for subscription management. Paid tiers go through Stripe hosted
 * Checkout (checkout → redirect → confirm); FREE is the only payment-less path.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "Subscription plan endpoints")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final StripeService stripeService;

    @GetMapping("/subscriptions/plans")
    @Operation(summary = "Get all available subscription plans (public)")
    public ResponseEntity<List<SubscriptionPlanResponse>> getPlans() {
        return ResponseEntity.ok(subscriptionService.getAvailablePlans());
    }

    @GetMapping("/builder/subscription")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Get current subscription details")
    public ResponseEntity<Map<String, Object>> getMySubscription(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionDetails(user));
    }

    @PostMapping("/builder/subscription/checkout")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Create a Stripe Checkout session for a paid tier")
    public ResponseEntity<Map<String, Object>> createCheckout(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(stripeService.createCheckoutSession(user, request.get("tier")));
    }

    @PostMapping("/builder/subscription/confirm")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Confirm a Stripe Checkout session after the success redirect")
    public ResponseEntity<Map<String, Object>> confirmCheckout(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(stripeService.confirmCheckoutSession(user, request.get("sessionId")));
    }

    @PostMapping("/builder/subscription/select-free")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Switch to the Free plan (immediate, no payment)")
    public ResponseEntity<Map<String, Object>> selectFreePlan(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(subscriptionService.selectFreePlan(user));
    }
}
