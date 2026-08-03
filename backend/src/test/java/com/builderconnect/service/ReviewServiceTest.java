package com.builderconnect.service;

import com.builderconnect.dto.request.ProductReviewRequest;
import com.builderconnect.dto.request.ReviewRequest;
import com.builderconnect.dto.response.ReviewResponse;
import com.builderconnect.entity.Material;
import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.Review;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.MaterialOrderItemRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.ReviewHelpfulnessRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    private static final long MATERIAL_ID = 50L;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ReviewHelpfulnessRepository reviewHelpfulnessRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private SupplierProfileRepository supplierProfileRepository;

    @Mock
    private MaterialOrderItemRepository materialOrderItemRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @Captor
    private ArgumentCaptor<Collection<MaterialOrder.OrderStatus>> statusesCaptor;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @InjectMocks
    private ReviewService reviewService;

    private User supplier;
    private User buyer;
    private Material material;

    @BeforeEach
    void setUp() {
        supplier = user(1L, "supplier@example.com", UserRole.SUPPLIER);
        buyer = user(2L, "buyer@example.com", UserRole.CLIENT);
        material = Material.builder()
                .supplier(supplier)
                .name("Portland Cement")
                .build();
        material.setId(MATERIAL_ID);
    }

    @Test
    @DisplayName("createMaterialReview flags a delivered buyer as verified purchase")
    void createMaterialReview_deliveredBuyer_isVerifiedPurchase() {
        stubMaterialReviewCreation(true);

        ReviewResponse response = reviewService.createMaterialReview(buyer, MATERIAL_ID, productRequest());

        assertThat(response.getIsVerifiedPurchase()).isTrue();
        verify(materialOrderItemRepository).existsByOrder_OrderedBy_IdAndMaterial_IdAndOrder_StatusIn(
                eq(buyer.getId()), eq(MATERIAL_ID), statusesCaptor.capture());
        assertThat(statusesCaptor.getValue()).containsExactlyInAnyOrder(
                MaterialOrder.OrderStatus.DELIVERED, MaterialOrder.OrderStatus.PARTIALLY_DELIVERED);
    }

    @Test
    @DisplayName("createMaterialReview leaves non-buyers unverified")
    void createMaterialReview_noDeliveredOrder_isNotVerifiedPurchase() {
        stubMaterialReviewCreation(false);

        ReviewResponse response = reviewService.createMaterialReview(buyer, MATERIAL_ID, productRequest());

        assertThat(response.getIsVerifiedPurchase()).isFalse();
    }

    @Test
    @DisplayName("Duplicate project review is rejected with a 400")
    void createClientToBuilderReview_duplicate_throwsBadRequest() {
        User client = user(10L, "client@example.com", UserRole.CLIENT);
        User builder = user(11L, "builder@example.com", UserRole.BUILDER);
        Project project = Project.builder()
                .client(client)
                .awardedBuilder(builder)
                .title("Kitchen Renovation")
                .build();
        project.setStatus(ProjectStatus.COMPLETED);

        when(projectRepository.findByIdAndDeletedFalse(7L)).thenReturn(Optional.of(project));
        when(reviewRepository.existsByReviewerIdAndProjectIdAndReviewType(
                client.getId(), 7L, Review.ReviewType.CLIENT_TO_BUILDER)).thenReturn(true);

        assertThatThrownBy(() -> reviewService.createClientToBuilderReview(client, 7L, reviewRequest()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already submitted");

        verify(reviewRepository, never()).save(any(Review.class));
    }

    @Test
    @DisplayName("Non-whitelisted sort silently falls back to createdAt DESC")
    void getMaterialReviews_unknownSort_fallsBackToCreatedAtDesc() {
        when(reviewRepository.searchMaterialReviews(
                eq(MATERIAL_ID), eq(Review.ReviewStatus.APPROVED), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(Page.empty());

        reviewService.getMaterialReviews(MATERIAL_ID, null, null,
                PageRequest.of(1, 10, Sort.by("comment")));

        verify(reviewRepository).searchMaterialReviews(
                eq(MATERIAL_ID), eq(Review.ReviewStatus.APPROVED), isNull(), isNull(), pageableCaptor.capture());
        Pageable used = pageableCaptor.getValue();
        assertThat(used.getPageNumber()).isEqualTo(1);
        assertThat(used.getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    @DisplayName("Whitelisted sort passes through unchanged")
    void getMaterialReviews_whitelistedSort_passesThrough() {
        when(reviewRepository.searchMaterialReviews(
                eq(MATERIAL_ID), eq(Review.ReviewStatus.APPROVED), eq(4), eq(5), any(Pageable.class)))
                .thenReturn(Page.empty());
        Pageable byHelpfulCount = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "helpfulCount"));

        reviewService.getMaterialReviews(MATERIAL_ID, 4, 5, byHelpfulCount);

        verify(reviewRepository).searchMaterialReviews(
                eq(MATERIAL_ID), eq(Review.ReviewStatus.APPROVED), eq(4), eq(5), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue()).isSameAs(byHelpfulCount);
    }

    private void stubMaterialReviewCreation(boolean hasDeliveredOrder) {
        when(materialRepository.findById(MATERIAL_ID)).thenReturn(Optional.of(material));
        when(reviewRepository.existsByReviewerIdAndMaterialIdAndReviewType(
                buyer.getId(), MATERIAL_ID, Review.ReviewType.MATERIAL_REVIEW)).thenReturn(false);
        when(materialOrderItemRepository.existsByOrder_OrderedBy_IdAndMaterial_IdAndOrder_StatusIn(
                eq(buyer.getId()), eq(MATERIAL_ID), anyCollection())).thenReturn(hasDeliveredOrder);
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepository.aggregateRatingByMaterial(
                eq(MATERIAL_ID), eq(Review.ReviewStatus.APPROVED), eq(Review.ReviewType.MATERIAL_REVIEW)))
                .thenReturn(List.of());
        when(supplierProfileRepository.findByUserId(supplier.getId())).thenReturn(Optional.empty());
    }

    private ProductReviewRequest productRequest() {
        return ProductReviewRequest.builder()
                .overallRating(4)
                .title("Solid product")
                .comment("Arrived on time")
                .build();
    }

    private ReviewRequest reviewRequest() {
        ReviewRequest request = new ReviewRequest();
        request.setOverallRating(5);
        request.setComment("Great work");
        return request;
    }

    private User user(Long id, String email, UserRole role) {
        User user = User.builder()
                .email(email)
                .password("hashed")
                .name(email)
                .role(role)
                .build();
        user.setId(id);
        return user;
    }
}
