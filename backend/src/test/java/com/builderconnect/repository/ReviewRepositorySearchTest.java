package com.builderconnect.repository;

import com.builderconnect.entity.Review;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// Base yml pins hibernate.dialect to MySQL, which silently breaks Hibernate DDL on the
// embedded H2 test database — override so create-drop actually creates the schema.
@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect")
class ReviewRepositorySearchTest {

    private static final Pageable UNSORTED = PageRequest.of(0, 20);
    private static final long MATERIAL_ID = 201L;
    private static final long OTHER_MATERIAL_ID = 202L;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    private User builder;

    @BeforeEach
    void setUp() {
        User reviewer = userRepository.save(user("reviewer@example.com"));
        User supplier = userRepository.save(user("supplier@example.com"));
        builder = userRepository.save(user("builder@example.com"));

        // Material reviews on MATERIAL_ID: 2, 3, 5 APPROVED; 4 HIDDEN; unrelated material 5 APPROVED.
        reviewRepository.save(materialReview(reviewer, supplier, MATERIAL_ID, 2, Review.ReviewStatus.APPROVED));
        reviewRepository.save(materialReview(reviewer, supplier, MATERIAL_ID, 3, Review.ReviewStatus.APPROVED));
        reviewRepository.save(materialReview(reviewer, supplier, MATERIAL_ID, 5, Review.ReviewStatus.APPROVED));
        reviewRepository.save(materialReview(reviewer, supplier, MATERIAL_ID, 4, Review.ReviewStatus.HIDDEN));
        reviewRepository.save(materialReview(reviewer, supplier, OTHER_MATERIAL_ID, 5, Review.ReviewStatus.APPROVED));

        // Builder reviews: 1, 4 APPROVED; 5 HIDDEN.
        reviewRepository.save(builderReview(reviewer, builder, 101L, 1, Review.ReviewStatus.APPROVED));
        reviewRepository.save(builderReview(reviewer, builder, 102L, 4, Review.ReviewStatus.APPROVED));
        reviewRepository.save(builderReview(reviewer, builder, 103L, 5, Review.ReviewStatus.HIDDEN));
    }

    @Test
    @DisplayName("Material rating band is inclusive, status- and material-scoped")
    void searchMaterialReviews_ratingBand_returnsOnlyInBand() {
        Page<Review> result = reviewRepository.searchMaterialReviews(
                MATERIAL_ID, Review.ReviewStatus.APPROVED, 2, 3, UNSORTED);

        assertThat(result.getContent())
                .hasSize(2)
                .allMatch(r -> r.getMaterialId() == MATERIAL_ID)
                .extracting(Review::getOverallRating)
                .containsExactlyInAnyOrder(2, 3);
    }

    @Test
    @DisplayName("Null band bounds mean no rating filter")
    void searchMaterialReviews_nullBounds_returnAllApproved() {
        Page<Review> result = reviewRepository.searchMaterialReviews(
                MATERIAL_ID, Review.ReviewStatus.APPROVED, null, null, UNSORTED);

        assertThat(result.getContent()).hasSize(3);
    }

    @Test
    @DisplayName("Pageable sort by overallRating drives material review order")
    void searchMaterialReviews_sortByRating_ordersResults() {
        Pageable byRatingDesc = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "overallRating"));

        Page<Review> result = reviewRepository.searchMaterialReviews(
                MATERIAL_ID, Review.ReviewStatus.APPROVED, null, null, byRatingDesc);

        List<Integer> ratings = result.getContent().stream().map(Review::getOverallRating).toList();
        assertThat(ratings).containsExactly(5, 3, 2);
    }

    @Test
    @DisplayName("Reviewee rating band excludes out-of-band and hidden reviews")
    void searchRevieweeReviews_ratingBand_returnsOnlyInBand() {
        Page<Review> result = reviewRepository.searchRevieweeReviews(
                builder.getId(), Review.ReviewStatus.APPROVED, 2, null, UNSORTED);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getOverallRating()).isEqualTo(4);
    }

    private User user(String email) {
        return User.builder()
                .email(email)
                .password("hashed")
                .name(email)
                .role(UserRole.CLIENT)
                .build();
    }

    private Review materialReview(User reviewer, User reviewee, Long materialId, int rating,
                                  Review.ReviewStatus status) {
        return Review.builder()
                .reviewer(reviewer)
                .reviewee(reviewee)
                .reviewType(Review.ReviewType.MATERIAL_REVIEW)
                .materialId(materialId)
                .overallRating(rating)
                .title("Rated " + rating)
                .comment("Comment " + rating)
                .status(status)
                .build();
    }

    private Review builderReview(User reviewer, User reviewee, Long projectId, int rating,
                                 Review.ReviewStatus status) {
        return Review.builder()
                .reviewer(reviewer)
                .reviewee(reviewee)
                .reviewType(Review.ReviewType.CLIENT_TO_BUILDER)
                .projectId(projectId)
                .overallRating(rating)
                .title("Rated " + rating)
                .comment("Comment " + rating)
                .status(status)
                .build();
    }
}
