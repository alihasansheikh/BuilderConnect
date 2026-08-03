package com.builderconnect.service;

import com.builderconnect.config.StripeProperties;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.LeadTransaction;
import com.builderconnect.entity.SubscriptionPayment;
import com.builderconnect.entity.SubscriptionPlan;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.SubscriptionPaymentRepository;
import com.builderconnect.repository.SubscriptionPlanRepository;
import com.builderconnect.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Real Stripe TEST-mode billing for builder subscriptions: hosted Checkout in
 * mode=payment (one-time 30-day period, no recurring billing). A paid session
 * is applied idempotently from BOTH the signature-verified webhook and the
 * success-redirect confirm endpoint, so the flow works without Stripe CLI
 * webhook forwarding.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StripeService {

    private static final int SUBSCRIPTION_PERIOD_DAYS = 30;
    private static final String CHECKOUT_COMPLETED_EVENT = "checkout.session.completed";
    private static final String PAYMENT_STATUS_PAID = "paid";

    private final StripeProperties stripeProperties;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final BuilderProfileRepository builderProfileRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final UserRepository userRepository;
    private final LeadService leadService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final PlatformTransactionManager transactionManager;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Create a hosted Checkout session for a paid tier. Same-tier checkout is
     * allowed on purpose — that IS the Renew flow. FREE has its own
     * payment-less path (SubscriptionService.selectFreePlan).
     */
    public Map<String, Object> createCheckoutSession(User builder, String tier) {
        requireConfigured();

        if (tier == null || tier.isBlank()) {
            throw new BadRequestException("Subscription tier is required");
        }

        SubscriptionPlan plan = subscriptionPlanRepository.findByTier(tier)
                .orElseThrow(() -> new BadRequestException("Invalid subscription tier: " + tier));

        if ("FREE".equals(plan.getTier()) || plan.getPrice() == null
                || plan.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("The Free plan does not require payment");
        }

        String baseUrl = normalizedFrontendUrl();
        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(baseUrl + "/builder/subscription?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(baseUrl + "/builder/subscription?checkout=cancelled")
                .setClientReferenceId(String.valueOf(builder.getId()))
                .setCustomerEmail(builder.getEmail())
                .putMetadata("userId", String.valueOf(builder.getId()))
                .putMetadata("tier", plan.getTier())
                .putMetadata("planId", String.valueOf(plan.getId()))
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("pkr")
                                // PKR is a 2-decimal currency: unit_amount is in paisa
                                .setUnitAmount(plan.getPrice()
                                        .multiply(BigDecimal.valueOf(100)).longValueExact())
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("BuilderConnect " + plan.getName() + " Plan — "
                                                + SUBSCRIPTION_PERIOD_DAYS + " days")
                                        .build())
                                .build())
                        .build())
                .build();

        try {
            Session session = Session.create(params, requestOptions());
            Map<String, Object> result = new HashMap<>();
            result.put("checkoutUrl", session.getUrl());
            result.put("sessionId", session.getId());
            return result;
        } catch (StripeException e) {
            log.error("Failed to create Stripe checkout session for user {} tier {}",
                    builder.getId(), tier, e);
            throw new BadRequestException("Could not start checkout, please try again");
        }
    }

    /**
     * Success-redirect fallback: retrieve the session from Stripe and apply it
     * if paid. Works without Stripe CLI webhook forwarding. Unpaid/expired
     * sessions return {applied:false, status} — never a 500.
     */
    public Map<String, Object> confirmCheckoutSession(User builder, String sessionId) {
        requireConfigured();

        if (sessionId == null || sessionId.isBlank()) {
            throw new BadRequestException("sessionId is required");
        }

        Session session;
        try {
            session = Session.retrieve(sessionId, requestOptions());
        } catch (StripeException e) {
            log.warn("Failed to retrieve Stripe session {} for user {}: {}",
                    sessionId, builder.getId(), e.getMessage());
            throw new BadRequestException("Could not verify the checkout session, please try again");
        }

        // Don't leak other users' sessions — a mismatch looks identical to a missing session
        String metadataUserId = session.getMetadata() != null
                ? session.getMetadata().get("userId") : null;
        if (!String.valueOf(builder.getId()).equals(metadataUserId)) {
            throw new ResourceNotFoundException("Checkout session not found");
        }

        if (!PAYMENT_STATUS_PAID.equals(session.getPaymentStatus())) {
            Map<String, Object> result = new HashMap<>();
            result.put("applied", false);
            result.put("status", session.getPaymentStatus());
            return result;
        }

        return applySessionIdempotently(session);
    }

    /**
     * Signature-verified webhook handler for checkout.session.completed.
     * Bad signature → 400 (so Stripe retries only on genuine failure);
     * fixture events without userId metadata are logged and ignored (200).
     */
    public void handleWebhookEvent(String payload, String signatureHeader) {
        requireConfigured();

        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, stripeProperties.getWebhookSecret());
        } catch (SignatureVerificationException e) {
            log.warn("Rejected Stripe webhook with invalid signature: {}", e.getMessage());
            throw new BadRequestException("Invalid Stripe webhook signature");
        }

        if (!CHECKOUT_COMPLETED_EVENT.equals(event.getType())) {
            return; // all other event types: ignore, 200
        }

        Session session = resolveSession(event);
        if (session == null) {
            log.warn("Could not resolve checkout session from Stripe event {}", event.getId());
            return;
        }

        String userId = session.getMetadata() != null ? session.getMetadata().get("userId") : null;
        if (userId == null) {
            // e.g. `stripe trigger checkout.session.completed` fixtures carry no metadata
            log.info("Stripe webhook session {} has no userId metadata — ignoring", session.getId());
            return;
        }

        if (PAYMENT_STATUS_PAID.equals(session.getPaymentStatus())) {
            applySessionIdempotently(session);
        }
    }

    /**
     * Deserialize the event's session; on API-version mismatch between the
     * account and the pinned SDK the deserializer comes back empty — silently
     * dropping the event would lose paid sessions, so re-fetch by id instead.
     */
    private Session resolveSession(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        if (deserializer.getObject().isPresent()) {
            return (Session) deserializer.getObject().get();
        }

        try {
            String sessionId = objectMapper.readTree(deserializer.getRawJson()).path("id").asText(null);
            if (sessionId == null || sessionId.isBlank()) {
                return null;
            }
            return Session.retrieve(sessionId, requestOptions());
        } catch (StripeException | JsonProcessingException e) {
            log.error("Failed to re-fetch checkout session for Stripe event {}", event.getId(), e);
            return null;
        }
    }

    /**
     * The single APPLY step, shared by webhook and confirm. The exists()
     * fast-path handles the common case; the UNIQUE(stripe_session_id)
     * constraint + DataIntegrityViolationException catch is the real guard
     * when both paths race past the check concurrently.
     */
    private Map<String, Object> applySessionIdempotently(Session session) {
        try {
            return new TransactionTemplate(transactionManager)
                    .execute(status -> applyPaidSession(session));
        } catch (DataIntegrityViolationException e) {
            log.info("Stripe session {} was already applied concurrently", session.getId());
            return alreadyProcessed();
        }
    }

    /** Runs inside a transaction (see applySessionIdempotently). */
    private Map<String, Object> applyPaidSession(Session session) {
        if (subscriptionPaymentRepository.existsByStripeSessionId(session.getId())) {
            return alreadyProcessed();
        }

        Long userId = Long.valueOf(session.getMetadata().get("userId"));
        String tier = session.getMetadata().get("tier");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        // Pessimistic lock serializes concurrent credit-granting for the same builder
        BuilderProfile profile = builderProfileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));
        SubscriptionPlan plan = subscriptionPlanRepository.findByTier(tier)
                .orElseThrow(() -> new BadRequestException("Invalid subscription tier: " + tier));

        LocalDateTime now = LocalDateTime.now();
        boolean sameTierUnexpired = tier.equals(profile.getSubscriptionTier())
                && profile.getSubscriptionExpiresAt() != null
                && profile.getSubscriptionExpiresAt().isAfter(now);
        // Renewal stacks from the current expiry; tier change or expired plan starts from now
        LocalDateTime newExpiry = sameTierUnexpired
                ? profile.getSubscriptionExpiresAt().plusDays(SUBSCRIPTION_PERIOD_DAYS)
                : now.plusDays(SUBSCRIPTION_PERIOD_DAYS);

        profile.setSubscriptionTier(tier);
        profile.setSubscriptionExpiresAt(newExpiry);
        builderProfileRepository.save(profile);

        leadService.addLeadCredits(user, plan.getLeadCreditsPerMonth(),
                LeadTransaction.TransactionType.SUBSCRIPTION_RENEWAL,
                "Stripe subscription payment — " + tier + " ("
                        + plan.getLeadCreditsPerMonth() + " credits)");

        BigDecimal amountPkr = BigDecimal.valueOf(session.getAmountTotal(), 2); // paisa -> PKR
        subscriptionPaymentRepository.save(SubscriptionPayment.builder()
                .builderProfile(profile)
                .user(user)
                .planId(plan.getId())
                .tier(tier)
                .amount(amountPkr)
                .currency("PKR")
                .stripeSessionId(session.getId())
                .stripePaymentIntent(session.getPaymentIntent())
                .paidAt(now)
                .build());

        auditService.logAction(user, "SUBSCRIPTION_PAYMENT", "BUILDER_PROFILE", profile.getId(),
                "Stripe payment for " + tier + " plan, session " + session.getId());

        notificationService.createNotification(user, NotificationType.PAYMENT_RECEIVED,
                "Subscription activated",
                tier + " plan active until " + newExpiry.toLocalDate(),
                "SUBSCRIPTION", profile.getId(), "/builder/subscription");

        notificationService.notifyAdmins(NotificationType.PAYMENT_RECEIVED,
                "Subscription Revenue",
                String.format("%s paid PKR %,.0f for the %s plan.",
                        HtmlUtils.htmlEscape(user.getName()), amountPkr, tier),
                "SUBSCRIPTION", profile.getId(), "/admin/revenue");

        emailService.sendSubscriptionReceiptEmail(user, plan.getName(),
                String.format("%,.2f", amountPkr), newExpiry.toLocalDate().toString());

        log.info("Applied Stripe subscription payment for user {}: {} until {}", userId, tier, newExpiry);

        Map<String, Object> result = new HashMap<>();
        result.put("applied", true);
        result.put("tier", tier);
        result.put("expiresAt", newExpiry);
        result.put("creditsGranted", plan.getLeadCreditsPerMonth());
        return result;
    }

    private Map<String, Object> alreadyProcessed() {
        Map<String, Object> result = new HashMap<>();
        result.put("applied", false);
        result.put("alreadyProcessed", true);
        return result;
    }

    private void requireConfigured() {
        if (!stripeProperties.isConfigured()) {
            throw new BadRequestException("Stripe is not configured on this server");
        }
    }

    /** Per-call RequestOptions — avoids the mutable Stripe.apiKey static. */
    private RequestOptions requestOptions() {
        return RequestOptions.builder().setApiKey(stripeProperties.getSecretKey()).build();
    }

    /** A trailing slash on app.frontend.url would produce "//builder/..." — normalize. */
    private String normalizedFrontendUrl() {
        return frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
    }
}
