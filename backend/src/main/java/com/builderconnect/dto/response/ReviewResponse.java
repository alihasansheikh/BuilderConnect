package com.builderconnect.dto.response;

import com.builderconnect.entity.Review;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private Long id;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerProfileImageUrl;
    private Long projectId;
    private String projectTitle;
    private Long materialId;
    private String productName;
    private String reviewType;
    private Boolean isVerifiedPurchase;
    private Integer overallRating;
    private Integer qualityRating;
    private Integer communicationRating;
    private Integer timelinessRating;
    private String title;
    private String comment;
    private String response;
    private Integer helpfulCount;
    private Integer notHelpfulCount;
    private LocalDateTime createdAt;

    public static ReviewResponse fromEntity(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .reviewerId(review.getReviewer() != null ? review.getReviewer().getId() : null)
                .reviewerName(review.getReviewer() != null ? review.getReviewer().getName() : null)
                .reviewerProfileImageUrl(review.getReviewer() != null ? review.getReviewer().getProfileImageUrl() : null)
                .projectId(review.getProjectId())
                .materialId(review.getMaterialId())
                .reviewType(review.getReviewType() != null ? review.getReviewType().name() : null)
                .isVerifiedPurchase(review.getIsVerifiedPurchase())
                .overallRating(review.getOverallRating())
                .qualityRating(review.getQualityRating())
                .communicationRating(review.getCommunicationRating())
                .timelinessRating(review.getTimelinessRating())
                .title(review.getTitle())
                .comment(review.getComment())
                .response(review.getResponse())
                .helpfulCount(review.getHelpfulCount())
                .notHelpfulCount(review.getNotHelpfulCount())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
