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
class ReviewRepositoryModerationTest {

    private static final Pageable UNSORTED = PageRequest.of(0, 20);

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        User reviewer = userRepository.save(user("reviewer@example.com"));
        User reviewee = userRepository.save(user("reviewee@example.com"));

        reviewRepository.save(review(reviewer, reviewee, Review.ReviewType.CLIENT_TO_BUILDER, 5,
                101L, null, Review.ReviewStatus.APPROVED));
        reviewRepository.save(review(reviewer, reviewee, Review.ReviewType.CLIENT_TO_BUILDER, 2,
                102L, null, Review.ReviewStatus.APPROVED));
        reviewRepository.save(review(reviewer, reviewee, Review.ReviewType.MATERIAL_REVIEW, 3,
                null, 201L, Review.ReviewStatus.APPROVED));
        reviewRepository.save(review(reviewer, reviewee, Review.ReviewType.MATERIAL_REVIEW, 4,
                null, 202L, Review.ReviewStatus.APPROVED));
        reviewRepository.save(review(reviewer, reviewee, Review.ReviewType.CLIENT_TO_BUILDER, 1,
                103L, null, Review.ReviewStatus.HIDDEN));
    }

    @Test
    @DisplayName("Type filter returns only reviews of that type")
    void searchForModeration_typeFilter_returnsOnlyThatType() {
        Page<Review> result = reviewRepository.searchForModeration(
                Review.ReviewStatus.APPROVED, Review.ReviewType.MATERIAL_REVIEW, null, null, UNSORTED);

        assertThat(result.getContent())
                .hasSize(2)
                .allMatch(r -> r.getReviewType() == Review.ReviewType.MATERIAL_REVIEW);
    }

    @Test
    @DisplayName("Rating band bounds are inclusive and status-scoped")
    void searchForModeration_ratingBand_returnsOnlyInBand() {
        Page<Review> neutral = reviewRepository.searchForModeration(
                Review.ReviewStatus.APPROVED, null, 3, 3, UNSORTED);
        assertThat(neutral.getContent()).hasSize(1);
        assertThat(neutral.getContent().get(0).getOverallRating()).isEqualTo(3);

        // The HIDDEN 1-star review must not leak into the APPROVED bad band.
        Page<Review> bad = reviewRepository.searchForModeration(
                Review.ReviewStatus.APPROVED, null, null, 2, UNSORTED);
        assertThat(bad.getContent()).hasSize(1);
        assertThat(bad.getContent().get(0).getOverallRating()).isEqualTo(2);
    }

    @Test
    @DisplayName("Type and rating band filters combine")
    void searchForModeration_typeAndBand_combine() {
        Page<Review> result = reviewRepository.searchForModeration(
                Review.ReviewStatus.APPROVED, Review.ReviewType.CLIENT_TO_BUILDER, 4, null, UNSORTED);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getOverallRating()).isEqualTo(5);
    }

    @Test
    @DisplayName("Pageable sort by overallRating drives result order")
    void searchForModeration_sortByRating_ordersResults() {
        Pageable byRatingDesc = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "overallRating"));

        Page<Review> result = reviewRepository.searchForModeration(
                Review.ReviewStatus.APPROVED, null, null, null, byRatingDesc);

        List<Integer> ratings = result.getContent().stream().map(Review::getOverallRating).toList();
        assertThat(ratings).containsExactly(5, 4, 3, 2);
    }

    private User user(String email) {
        return User.builder()
                .email(email)
                .password("hashed")
                .name(email)
                .role(UserRole.CLIENT)
                .build();
    }

    private Review review(User reviewer, User reviewee, Review.ReviewType type, int rating,
                          Long projectId, Long materialId, Review.ReviewStatus status) {
        return Review.builder()
                .reviewer(reviewer)
                .reviewee(reviewee)
                .reviewType(type)
                .overallRating(rating)
                .projectId(projectId)
                .materialId(materialId)
                .title("Rated " + rating)
                .comment("Comment " + rating)
                .status(status)
                .build();
    }
}
