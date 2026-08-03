package com.builderconnect.service;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.Review;
import com.builderconnect.entity.User;
import com.builderconnect.enums.BidStatus;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the builder analytics payload for {@code GET /v1/builder/me/analytics}:
 * lifetime bid/project/profile metrics and received earnings for every builder, plus
 * 12-month trend series and a review-rating distribution ONLY for builders whose
 * effective plan grants analytics access. Trends are gated here (server-side) so an
 * expired or downgraded builder never receives them regardless of the UI.
 */
@Service
@RequiredArgsConstructor
public class BuilderAnalyticsService {

    private static final int TREND_MONTHS = 12;

    private final BuilderProfileRepository builderProfileRepository;
    private final BidRepository bidRepository;
    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final ReviewRepository reviewRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalytics(User user) {
        BuilderProfile profile = builderProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        Long builderId = user.getId();
        Map<String, Object> analytics = new HashMap<>();

        analytics.put("bids", bidMetrics(builderId));
        analytics.put("projects", projectMetrics(builderId));
        analytics.put("profile", profileMetrics(profile));
        analytics.put("earningsReceived", milestoneRepository.sumReceivedEarningsByBuilder(builderId));

        boolean analyticsAccess = hasAnalyticsAccess(profile);
        analytics.put("analyticsAccess", analyticsAccess);

        if (analyticsAccess) {
            analytics.put("monthly", monthlyTrends(builderId));
            analytics.put("reviewDistribution", reviewDistribution(builderId));
        }

        return analytics;
    }

    private Map<String, Object> bidMetrics(Long builderId) {
        long totalBids = bidRepository.countByBuilderId(builderId);
        long acceptedBids = bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.ACCEPTED);

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("total", totalBids);
        metrics.put("submitted", bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.SUBMITTED));
        metrics.put("accepted", acceptedBids);
        metrics.put("rejected", bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.REJECTED));
        metrics.put("withdrawn", bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.WITHDRAWN));
        metrics.put("winRate", totalBids > 0 ? Math.round((double) acceptedBids / totalBids * 100) : 0);
        return metrics;
    }

    private Map<String, Object> projectMetrics(Long builderId) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("total", projectRepository.countByBuilderId(builderId));
        metrics.put("inProgress",
                projectRepository.countByAwardedBuilderIdAndStatusAndDeletedFalse(builderId, ProjectStatus.IN_PROGRESS));
        metrics.put("completed",
                projectRepository.countByAwardedBuilderIdAndStatusAndDeletedFalse(builderId, ProjectStatus.COMPLETED));
        metrics.put("totalEarnings", projectRepository.sumCompletedProjectValueByBuilder(builderId));
        return metrics;
    }

    private Map<String, Object> profileMetrics(BuilderProfile profile) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("averageRating", profile.getAverageRating());
        metrics.put("totalReviews", profile.getTotalReviews());
        metrics.put("isVerified", profile.getIsVerified());
        metrics.put("subscriptionTier", profile.getSubscriptionTier());
        return metrics;
    }

    /** Analytics is a perk of the EFFECTIVE plan — an expired paid tier resolves to FREE. */
    private boolean hasAnalyticsAccess(BuilderProfile profile) {
        return subscriptionPlanRepository.findByTier(profile.getEffectiveTier())
                .map(plan -> Boolean.TRUE.equals(plan.getAnalyticsAccess()))
                .orElse(false);
    }

    private List<Map<String, Object>> monthlyTrends(Long builderId) {
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime trendStart = currentMonth.minusMonths(TREND_MONTHS - 1).atDay(1).atStartOfDay();

        Map<YearMonth, long[]> bidsByMonth = new HashMap<>(); // [bidCount, wonCount]
        for (Object[] row : bidRepository.getMonthlyBidStats(builderId, trendStart)) {
            bidsByMonth.put(yearMonthOf(row[0], row[1]), new long[]{toLong(row[2]), toLong(row[3])});
        }

        Map<YearMonth, BigDecimal> revenueByMonth = new HashMap<>();
        for (Object[] row : milestoneRepository.getMonthlyEarningsByBuilder(builderId, trendStart)) {
            revenueByMonth.put(yearMonthOf(row[0], row[1]), toBigDecimal(row[2]));
        }

        Map<YearMonth, double[]> reviewsByMonth = new HashMap<>(); // [avgRating, reviewCount]
        for (Object[] row : reviewRepository.getMonthlyRatingByReviewee(
                builderId, Review.ReviewStatus.APPROVED, trendStart)) {
            reviewsByMonth.put(yearMonthOf(row[0], row[1]), new double[]{toDouble(row[2]), toLong(row[3])});
        }

        List<Map<String, Object>> monthly = new ArrayList<>();
        for (int i = TREND_MONTHS - 1; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            long[] bids = bidsByMonth.getOrDefault(month, new long[]{0L, 0L});
            double[] reviews = reviewsByMonth.getOrDefault(month, new double[]{0d, 0d});

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("month", month.toString()); // e.g. "2026-07"
            item.put("bids", bids[0]);
            item.put("won", bids[1]);
            item.put("revenue", revenueByMonth.getOrDefault(month, BigDecimal.ZERO));
            item.put("avgRating", round1(reviews[0]));
            item.put("reviews", (long) reviews[1]);
            monthly.add(item);
        }
        return monthly;
    }

    private List<Map<String, Object>> reviewDistribution(Long builderId) {
        Map<Integer, Long> byRating = new HashMap<>();
        for (Object[] row : reviewRepository.getRatingDistributionByReviewee(builderId, Review.ReviewStatus.APPROVED)) {
            byRating.put((int) toLong(row[0]), toLong(row[1]));
        }

        List<Map<String, Object>> distribution = new ArrayList<>();
        for (int rating = 5; rating >= 1; rating--) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("rating", rating);
            item.put("count", byRating.getOrDefault(rating, 0L));
            distribution.add(item);
        }
        return distribution;
    }

    private static YearMonth yearMonthOf(Object year, Object month) {
        return YearMonth.of((int) toLong(year), (int) toLong(month));
    }

    private static long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private static double toDouble(Object value) {
        return value == null ? 0d : ((Number) value).doubleValue();
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return BigDecimal.valueOf(((Number) value).doubleValue());
    }

    private static double round1(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
