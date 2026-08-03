package com.builderconnect.service;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.Review;
import com.builderconnect.entity.SubscriptionPlan;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SubscriptionPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BuilderAnalyticsServiceTest {

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private BidRepository bidRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @InjectMocks
    private BuilderAnalyticsService builderAnalyticsService;

    private User builderUser;

    @BeforeEach
    void setUp() {
        builderUser = User.builder()
                .email("builder@test.com")
                .name("Test Builder")
                .role(UserRole.BUILDER)
                .build();
        builderUser.setId(7L);
    }

    private BuilderProfile profileWithTier(String tier) {
        return BuilderProfile.builder()
                .user(builderUser)
                .subscriptionTier(tier)
                .averageRating(new BigDecimal("4.50"))
                .totalReviews(4)
                .isVerified(true)
                .build();
    }

    private void stubBaseMetrics() {
        when(bidRepository.countByBuilderId(7L)).thenReturn(6L);
        when(bidRepository.countByBuilderIdAndStatus(eq(7L), any())).thenReturn(1L);
        when(projectRepository.countByBuilderId(7L)).thenReturn(3L);
        when(projectRepository.countByAwardedBuilderIdAndStatusAndDeletedFalse(eq(7L), any())).thenReturn(1L);
        when(projectRepository.sumCompletedProjectValueByBuilder(7L)).thenReturn(new BigDecimal("1000000"));
        when(milestoneRepository.sumReceivedEarningsByBuilder(7L)).thenReturn(new BigDecimal("250000"));
    }

    @Test
    @DisplayName("getAnalytics zero-fills 12 monthly buckets and places aggregates in the right month")
    void getAnalytics_analyticsPlan_zeroFillsTwelveMonths() {
        when(builderProfileRepository.findByUserId(7L)).thenReturn(Optional.of(profileWithTier("PROFESSIONAL")));
        when(subscriptionPlanRepository.findByTier("PROFESSIONAL"))
                .thenReturn(Optional.of(SubscriptionPlan.builder().tier("PROFESSIONAL").analyticsAccess(true).build()));
        stubBaseMetrics();

        YearMonth now = YearMonth.now();
        when(bidRepository.getMonthlyBidStats(eq(7L), any())).thenReturn(List.<Object[]>of(
                new Object[]{now.getYear(), now.getMonthValue(), 3L, 1L}));
        when(milestoneRepository.getMonthlyEarningsByBuilder(eq(7L), any())).thenReturn(List.<Object[]>of(
                new Object[]{now.getYear(), now.getMonthValue(), new BigDecimal("50000")}));
        when(reviewRepository.getMonthlyRatingByReviewee(eq(7L), eq(Review.ReviewStatus.APPROVED), any()))
                .thenReturn(List.<Object[]>of(new Object[]{now.getYear(), now.getMonthValue(), 4.5d, 2L}));
        when(reviewRepository.getRatingDistributionByReviewee(7L, Review.ReviewStatus.APPROVED))
                .thenReturn(List.<Object[]>of(new Object[]{5, 3L}, new Object[]{4, 1L}));

        Map<String, Object> analytics = builderAnalyticsService.getAnalytics(builderUser);

        assertThat(analytics.get("analyticsAccess")).isEqualTo(true);
        assertThat(analytics.get("earningsReceived")).isEqualTo(new BigDecimal("250000"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> monthly = (List<Map<String, Object>>) analytics.get("monthly");
        assertThat(monthly).hasSize(12);

        Map<String, Object> current = monthly.get(11);
        assertThat(current.get("month")).isEqualTo(now.toString());
        assertThat(current.get("bids")).isEqualTo(3L);
        assertThat(current.get("won")).isEqualTo(1L);
        assertThat(current.get("revenue")).isEqualTo(new BigDecimal("50000"));
        assertThat(current.get("avgRating")).isEqualTo(4.5d);
        assertThat(current.get("reviews")).isEqualTo(2L);

        // Every other bucket is zero-filled.
        Map<String, Object> earliest = monthly.get(0);
        assertThat(earliest.get("bids")).isEqualTo(0L);
        assertThat(earliest.get("won")).isEqualTo(0L);
        assertThat(earliest.get("revenue")).isEqualTo(BigDecimal.ZERO);
        assertThat(earliest.get("reviews")).isEqualTo(0L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> distribution = (List<Map<String, Object>>) analytics.get("reviewDistribution");
        assertThat(distribution).hasSize(5);
        assertThat(distribution.get(0).get("rating")).isEqualTo(5);
        assertThat(distribution.get(0).get("count")).isEqualTo(3L);
        // A star with no reviews is present with a zero count (3-star here).
        assertThat(distribution.get(2).get("rating")).isEqualTo(3);
        assertThat(distribution.get(2).get("count")).isEqualTo(0L);
    }

    @Test
    @DisplayName("getAnalytics omits trend series when the effective plan has no analytics access")
    void getAnalytics_noAnalyticsAccess_stripsTrends() {
        when(builderProfileRepository.findByUserId(7L)).thenReturn(Optional.of(profileWithTier("FREE")));
        when(subscriptionPlanRepository.findByTier("FREE"))
                .thenReturn(Optional.of(SubscriptionPlan.builder().tier("FREE").analyticsAccess(false).build()));
        stubBaseMetrics();

        Map<String, Object> analytics = builderAnalyticsService.getAnalytics(builderUser);

        assertThat(analytics.get("analyticsAccess")).isEqualTo(false);
        assertThat(analytics.get("earningsReceived")).isEqualTo(new BigDecimal("250000"));
        assertThat(analytics).doesNotContainKeys("monthly", "reviewDistribution");
        assertThat(analytics).containsKeys("bids", "projects", "profile");

        // The gated trend queries must never run for a non-analytics plan.
        verify(bidRepository, never()).getMonthlyBidStats(any(), any());
        verify(milestoneRepository, never()).getMonthlyEarningsByBuilder(any(), any());
        verify(reviewRepository, never()).getRatingDistributionByReviewee(any(), any());
    }
}
