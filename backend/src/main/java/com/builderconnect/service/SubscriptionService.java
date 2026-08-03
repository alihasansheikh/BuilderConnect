package com.builderconnect.service;

import com.builderconnect.dto.response.SubscriptionPlanResponse;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.SubscriptionPlan;
import com.builderconnect.entity.User;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for managing builder subscriptions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final BuilderProfileRepository builderProfileRepository;
    private final AuditService auditService;

    /**
     * Get all active subscription plans.
     */
    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getAvailablePlans() {
        return subscriptionPlanRepository.findByIsActiveTrueOrderByPriceAsc()
                .stream()
                .map(SubscriptionPlanResponse::fromEntity)
                .toList();
    }

    /**
     * Get current subscription details for a builder.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSubscriptionDetails(User builder) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        SubscriptionPlan currentPlan = subscriptionPlanRepository.findByTier(profile.getSubscriptionTier())
                .orElse(null);

        Map<String, Object> details = new HashMap<>();
        details.put("currentTier", profile.getSubscriptionTier());
        details.put("effectiveTier", profile.getEffectiveTier());
        details.put("expiresAt", profile.getSubscriptionExpiresAt());
        details.put("leadCredits", profile.getLeadCredits());
        details.put("isExpired", profile.isSubscriptionExpired());

        if (currentPlan != null) {
            details.put("plan", SubscriptionPlanResponse.fromEntity(currentPlan));
        }

        return details;
    }

    /**
     * Resolve the plan whose limits actually apply right now: an expired paid
     * tier is treated as FREE (see BuilderProfile.getEffectiveTier()).
     */
    @Transactional(readOnly = true)
    public SubscriptionPlan getEffectivePlan(BuilderProfile profile) {
        return subscriptionPlanRepository.findByTier(profile.getEffectiveTier())
                .orElseThrow(() -> new IllegalStateException(
                        "Plan missing for tier " + profile.getEffectiveTier()));
    }

    /**
     * The only legitimate payment-less tier transition: switch to the Free
     * plan immediately. No credit grant, no expiry (FREE never expires).
     * Paid tiers are entered exclusively through Stripe Checkout (StripeService).
     */
    @Transactional
    public Map<String, Object> selectFreePlan(User builder) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        String oldTier = profile.getSubscriptionTier();
        profile.setSubscriptionTier("FREE");
        profile.setSubscriptionExpiresAt(null);
        builderProfileRepository.save(profile);

        auditService.logAction(builder, "SUBSCRIPTION_DOWNGRADED_FREE", "BUILDER_PROFILE", profile.getId(),
                "Switched from " + oldTier + " to FREE");

        log.info("Builder {} switched from {} to FREE", builder.getId(), oldTier);

        Map<String, Object> result = new HashMap<>();
        result.put("tier", "FREE");
        result.put("expiresAt", null);
        return result;
    }
}
