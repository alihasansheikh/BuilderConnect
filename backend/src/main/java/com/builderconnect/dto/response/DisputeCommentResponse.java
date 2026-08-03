package com.builderconnect.dto.response;

import com.builderconnect.entity.DisputeComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisputeCommentResponse {

    private Long id;
    private Long disputeId;
    private String comment;
    private Boolean isInternal;
    private String attachments;
    private LocalDateTime createdAt;

    // User info
    private Long userId;
    private String userName;
    private String userRole;

    public static DisputeCommentResponse fromEntity(DisputeComment comment) {
        DisputeCommentResponseBuilder builder = DisputeCommentResponse.builder()
                .id(comment.getId())
                .disputeId(comment.getDispute().getId())
                .comment(comment.getComment())
                .isInternal(comment.getIsInternal())
                .attachments(comment.getAttachments())
                .createdAt(comment.getCreatedAt());

        if (comment.getUser() != null) {
            builder.userId(comment.getUser().getId())
                    .userName(comment.getUser().getName())
                    .userRole(comment.getUser().getRole().name());
        }

        return builder.build();
    }
}
