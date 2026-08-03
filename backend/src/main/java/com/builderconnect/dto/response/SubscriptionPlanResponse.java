package com.builderconnect.dto.response;

import com.builderconnect.entity.SubscriptionPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlanResponse {

    private Long id;
    private String name;
    private String tier;
    private BigDecimal price;
    private String billingCycle;
    private Integer leadCreditsPerMonth;
    private Integer maxActiveBids;
    private Integer maxPortfolioImages;
    private Boolean featuredListing;
    private Boolean prioritySupport;
    private Boolean analyticsAccess;
    private String badgeLabel;
    private String description;

    public static SubscriptionPlanResponse fromEntity(SubscriptionPlan plan) {
        return SubscriptionPlanResponse.builder()
                .id(plan.getId())
                .name(plan.getName())
                .tier(plan.getTier())
                .price(plan.getPrice())
                .billingCycle(plan.getBillingCycle())
                .leadCreditsPerMonth(plan.getLeadCreditsPerMonth())
                .maxActiveBids(plan.getMaxActiveBids())
                .maxPortfolioImages(plan.getMaxPortfolioImages())
                .featuredListing(plan.getFeaturedListing())
                .prioritySupport(plan.getPrioritySupport())
                .analyticsAccess(plan.getAnalyticsAccess())
                .badgeLabel(plan.getBadgeLabel())
                .description(plan.getDescription())
                .build();
    }
}
