package com.builderconnect.repository;

import com.builderconnect.entity.ReviewHelpfulness;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewHelpfulnessRepository extends JpaRepository<ReviewHelpfulness, Long> {

    Optional<ReviewHelpfulness> findByReviewIdAndUserId(Long reviewId, Long userId);

    List<ReviewHelpfulness> findByUserIdAndReviewIdIn(Long userId, List<Long> reviewIds);
}
