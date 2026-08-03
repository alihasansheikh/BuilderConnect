package com.builderconnect.service;

import com.builderconnect.dto.request.ProductReviewRequest;
import com.builderconnect.dto.request.ReviewRequest;
import com.builderconnect.dto.response.MaterialReviewCheckResponse;
import com.builderconnect.dto.response.ProjectReviewCheckResponse;
import com.builderconnect.dto.response.ReviewResponse;
import com.builderconnect.dto.response.ReviewVoteResponse;
import com.builderconnect.entity.Material;
import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.Review;
import com.builderconnect.entity.ReviewHelpfulness;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.MaterialOrderItemRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.ReviewHelpfulnessRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing project and product (material) reviews.
 */
@Service
@RequiredArgsConstructor
public class ReviewService {

    /** Sort properties the public review lists accept from clients. */
    private static final Set<String> REVIEW_SORT_PROPERTIES = Set.of("createdAt", "overallRating", "helpfulCount");

    /** Order statuses that count as a completed purchase for the verified-purchase badge. */
    private static final List<MaterialOrder.OrderStatus> VERIFIED_PURCHASE_STATUSES =
            List.of(MaterialOrder.OrderStatus.DELIVERED, MaterialOrder.OrderStatus.PARTIALLY_DELIVERED);

    private final ReviewRepository reviewRepository;
    private final ReviewHelpfulnessRepository reviewHelpfulnessRepository;
    private final ProjectRepository projectRepository;
    private final BuilderProfileRepository builderProfileRepository;
    private final MaterialRepository materialRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final MaterialOrderItemRepository materialOrderItemRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public ReviewResponse createClientToBuilderReview(User client, Long projectId, ReviewRequest request) {
        validateRating("overallRating", request.getOverallRating());
        validateRating("qualityRating", request.getQualityRating());
        validateRating("communicationRating", request.getCommunicationRating());
        validateRating("timelinessRating", request.getTimelinessRating());

        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new BadRequestException("You do not own this project");
        }

        if (project.getStatus() != ProjectStatus.COMPLETED) {
            throw new BadRequestException("Reviews can only be submitted for completed projects");
        }

        if (project.getAwardedBuilder() == null) {
            throw new BadRequestException("This project has no assigned builder");
        }

        boolean alreadyReviewed = reviewRepository.existsByReviewerIdAndProjectIdAndReviewType(
                client.getId(), projectId, Review.ReviewType.CLIENT_TO_BUILDER);
        if (alreadyReviewed) {
            throw new BadRequestException("You have already submitted a review for this project");
        }

        Review review = Review.builder()
                .reviewer(client)
                .reviewee(project.getAwardedBuilder())
                .projectId(projectId)
                .reviewType(Review.ReviewType.CLIENT_TO_BUILDER)
                .overallRating(request.getOverallRating())
                .qualityRating(request.getQualityRating())
                .communicationRating(request.getCommunicationRating())
                .timelinessRating(request.getTimelinessRating())
                .title(request.getTitle())
                .comment(request.getComment())
                // Builder reviews are visible immediately; admins can still hide them.
                .status(Review.ReviewStatus.APPROVED)
                .isVerifiedPurchase(true)
                .build();

        review = reviewRepository.save(review);

        // Rating rollups at creation — exact recompute keeps them consistent with moderation.
        recomputeBuilderRollups(project.getAwardedBuilder().getId());

        // Notify the builder they received a review.
        notificationService.notifyNewReview(project.getAwardedBuilder(), review);

        return ReviewResponse.fromEntity(review);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getBuilderReviews(Long builderUserId, Integer minRating, Integer maxRating,
                                                  Pageable pageable) {
        return toEnrichedPage(reviewRepository.searchRevieweeReviews(
                builderUserId, Review.ReviewStatus.APPROVED, minRating, maxRating, whitelistReviewSort(pageable)));
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(User builder, Integer minRating, Integer maxRating, Pageable pageable) {
        return toEnrichedPage(reviewRepository.searchRevieweeReviews(
                builder.getId(), Review.ReviewStatus.APPROVED, minRating, maxRating, whitelistReviewSort(pageable)));
    }

    @Transactional
    public ReviewResponse createMaterialReview(User reviewer, Long materialId, ProductReviewRequest request) {
        validateRating("overallRating", request.getOverallRating());

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        if (material.getSupplier().getId().equals(reviewer.getId())) {
            throw new BadRequestException("You cannot review your own product");
        }

        boolean alreadyReviewed = reviewRepository.existsByReviewerIdAndMaterialIdAndReviewType(
                reviewer.getId(), materialId, Review.ReviewType.MATERIAL_REVIEW);
        if (alreadyReviewed) {
            throw new IllegalStateException("You have already reviewed this product");
        }

        Review review = Review.builder()
                .reviewer(reviewer)
                .reviewee(material.getSupplier())
                .materialId(materialId)
                .reviewType(Review.ReviewType.MATERIAL_REVIEW)
                .overallRating(request.getOverallRating())
                .title(request.getTitle())
                .comment(request.getComment())
                // Product reviews are visible immediately; admins can still hide/flag them.
                .status(Review.ReviewStatus.APPROVED)
                .isVerifiedPurchase(materialOrderItemRepository
                        .existsByOrder_OrderedBy_IdAndMaterial_IdAndOrder_StatusIn(
                                reviewer.getId(), materialId, VERIFIED_PURCHASE_STATUSES))
                .build();

        review = reviewRepository.save(review);

        // Rating rollups at creation — exact recompute keeps them consistent with moderation.
        recomputeMaterialRollups(materialId, material.getSupplier().getId());

        notificationService.notifyProductReview(material, review);

        auditService.logAction(reviewer, "MATERIAL_REVIEW_CREATED", "REVIEW", review.getId(),
                "Reviewed material " + material.getName() + " (" + request.getOverallRating() + "/5)");

        return ReviewResponse.fromEntity(review);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMaterialReviews(Long materialId, Integer minRating, Integer maxRating,
                                                    Pageable pageable) {
        return toEnrichedPage(reviewRepository.searchMaterialReviews(
                materialId, Review.ReviewStatus.APPROVED, minRating, maxRating, whitelistReviewSort(pageable)));
    }

    @Transactional(readOnly = true)
    public MaterialReviewCheckResponse getMyMaterialReview(User user, Long materialId) {
        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        boolean isOwnProduct = material.getSupplier().getId().equals(user.getId());
        ReviewResponse review = reviewRepository
                .findByReviewerIdAndMaterialIdAndReviewType(
                        user.getId(), materialId, Review.ReviewType.MATERIAL_REVIEW)
                .map(ReviewResponse::fromEntity)
                .orElse(null);

        return MaterialReviewCheckResponse.builder()
                .hasReviewed(review != null)
                .canReview(!isOwnProduct && review == null)
                .review(review)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean hasReviewed(Long clientId, Long projectId) {
        return reviewRepository.existsByReviewerIdAndProjectIdAndReviewType(
                clientId, projectId, Review.ReviewType.CLIENT_TO_BUILDER);
    }

    @Transactional(readOnly = true)
    public ProjectReviewCheckResponse getMyProjectReview(User user, Long projectId) {
        ReviewResponse review = null;
        if (hasReviewed(user.getId(), projectId)) {
            review = reviewRepository
                    .findByReviewerIdAndProjectIdAndReviewType(
                            user.getId(), projectId, Review.ReviewType.CLIENT_TO_BUILDER)
                    .map(ReviewResponse::fromEntity)
                    .orElse(null);
        }

        return ProjectReviewCheckResponse.builder()
                .hasReviewed(review != null)
                .review(review)
                .build();
    }

    /**
     * Cast, switch, or toggle off a helpfulness vote on an approved review.
     */
    @Transactional
    public ReviewVoteResponse voteHelpful(User voter, Long reviewId, boolean helpful) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));

        if (review.getStatus() != Review.ReviewStatus.APPROVED) {
            throw new BadRequestException("You can only vote on approved reviews");
        }

        if (review.getReviewer().getId().equals(voter.getId())) {
            throw new BadRequestException("You cannot vote on your own review");
        }

        String myVote;
        ReviewHelpfulness existingVote = reviewHelpfulnessRepository
                .findByReviewIdAndUserId(reviewId, voter.getId())
                .orElse(null);

        if (existingVote == null) {
            // First vote — record it and bump the matching counter.
            ReviewHelpfulness vote = ReviewHelpfulness.builder()
                    .review(review)
                    .user(voter)
                    .isHelpful(helpful)
                    .build();
            reviewHelpfulnessRepository.save(vote);
            adjustVoteCounter(review, helpful, +1);
            myVote = helpful ? "HELPFUL" : "NOT_HELPFUL";
        } else if (Boolean.TRUE.equals(existingVote.getIsHelpful()) == helpful) {
            // Same vote again — toggle it off.
            reviewHelpfulnessRepository.delete(existingVote);
            adjustVoteCounter(review, helpful, -1);
            myVote = null;
        } else {
            // Opposite vote — switch sides.
            existingVote.setIsHelpful(helpful);
            reviewHelpfulnessRepository.save(existingVote);
            adjustVoteCounter(review, helpful, +1);
            adjustVoteCounter(review, !helpful, -1);
            myVote = helpful ? "HELPFUL" : "NOT_HELPFUL";
        }

        review = reviewRepository.save(review);

        return ReviewVoteResponse.builder()
                .helpfulCount(review.getHelpfulCount() != null ? review.getHelpfulCount() : 0)
                .notHelpfulCount(review.getNotHelpfulCount() != null ? review.getNotHelpfulCount() : 0)
                .myVote(myVote)
                .build();
    }

    /**
     * Get the current user's helpfulness votes across a material's reviews.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyVotes(User user, Long materialId) {
        List<Long> reviewIds = reviewRepository.findIdsByMaterialId(materialId);
        if (reviewIds.isEmpty()) {
            return List.of();
        }

        return reviewHelpfulnessRepository.findByUserIdAndReviewIdIn(user.getId(), reviewIds)
                .stream()
                .map(vote -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("reviewId", vote.getReview().getId());
                    entry.put("helpful", Boolean.TRUE.equals(vote.getIsHelpful()));
                    return entry;
                })
                .toList();
    }

    /**
     * Exact recompute of material + supplier profile rating rollups over
     * APPROVED MATERIAL_REVIEWs (0/ZERO when none). Used on review creation
     * and whenever moderation changes a material review's status.
     */
    @Transactional
    public void recomputeMaterialRollups(Long materialId, Long revieweeUserId) {
        materialRepository.findById(materialId).ifPresent(material -> {
            Object[] agg = firstAggregateRow(reviewRepository.aggregateRatingByMaterial(
                    materialId, Review.ReviewStatus.APPROVED, Review.ReviewType.MATERIAL_REVIEW));
            material.setAverageRating(toAverage(agg));
            material.setTotalReviews(toCount(agg));
            materialRepository.save(material);
        });

        supplierProfileRepository.findByUserId(revieweeUserId).ifPresent(profile -> {
            Object[] agg = firstAggregateRow(reviewRepository.aggregateRatingByReviewee(
                    revieweeUserId, Review.ReviewStatus.APPROVED, Review.ReviewType.MATERIAL_REVIEW));
            profile.setAverageRating(toAverage(agg));
            profile.setTotalReviews(toCount(agg));
            supplierProfileRepository.save(profile);
        });
    }

    /**
     * Exact recompute of builder profile rating rollups over APPROVED
     * CLIENT_TO_BUILDER reviews (0/ZERO when none). Used on review creation
     * and whenever moderation changes a builder review's status.
     */
    @Transactional
    public void recomputeBuilderRollups(Long builderUserId) {
        builderProfileRepository.findByUserId(builderUserId).ifPresent(profile -> {
            Object[] agg = firstAggregateRow(reviewRepository.aggregateRatingByReviewee(
                    builderUserId, Review.ReviewStatus.APPROVED, Review.ReviewType.CLIENT_TO_BUILDER));
            profile.setAverageRating(toAverage(agg));
            profile.setTotalReviews(toCount(agg));
            builderProfileRepository.save(profile);
        });
    }

    /** The list queries have no ORDER BY, so an unvetted client sort would reach SQL directly. */
    private Pageable whitelistReviewSort(Pageable pageable) {
        boolean allowed = pageable.getSort().isSorted()
                && pageable.getSort().stream()
                        .allMatch(order -> REVIEW_SORT_PROPERTIES.contains(order.getProperty()));
        if (allowed) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    /** Map a review page to responses, resolving product/project names via one batch lookup each. */
    private Page<ReviewResponse> toEnrichedPage(Page<Review> reviews) {
        List<Long> materialIds = reviews.getContent().stream()
                .map(Review::getMaterialId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, String> materialNames = materialIds.isEmpty() ? Map.of()
                : materialRepository.findAllById(materialIds).stream()
                        .collect(Collectors.toMap(Material::getId, Material::getName));

        List<Long> projectIds = reviews.getContent().stream()
                .map(Review::getProjectId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, String> projectTitles = projectIds.isEmpty() ? Map.of()
                : projectRepository.findAllById(projectIds).stream()
                        .collect(Collectors.toMap(Project::getId, Project::getTitle));

        return reviews.map(review -> {
            ReviewResponse response = ReviewResponse.fromEntity(review);
            if (review.getMaterialId() != null) {
                response.setProductName(materialNames.get(review.getMaterialId()));
            }
            if (review.getProjectId() != null) {
                response.setProjectTitle(projectTitles.get(review.getProjectId()));
            }
            return response;
        });
    }

    private void adjustVoteCounter(Review review, boolean helpfulCounter, int delta) {
        if (helpfulCounter) {
            int current = review.getHelpfulCount() != null ? review.getHelpfulCount() : 0;
            review.setHelpfulCount(Math.max(0, current + delta));
        } else {
            int current = review.getNotHelpfulCount() != null ? review.getNotHelpfulCount() : 0;
            review.setNotHelpfulCount(Math.max(0, current + delta));
        }
    }

    private Object[] firstAggregateRow(List<Object[]> rows) {
        return rows.isEmpty() ? new Object[]{null, 0L} : rows.get(0);
    }

    private BigDecimal toAverage(Object[] aggregateRow) {
        Object avg = aggregateRow[0];
        if (avg == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(((Number) avg).doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }

    private int toCount(Object[] aggregateRow) {
        Object count = aggregateRow[1];
        return count != null ? ((Number) count).intValue() : 0;
    }

    private void validateRating(String fieldName, Integer rating) {
        if (rating != null && (rating < 1 || rating > 5)) {
            throw new BadRequestException(fieldName + " must be between 1 and 5");
        }
    }
}
