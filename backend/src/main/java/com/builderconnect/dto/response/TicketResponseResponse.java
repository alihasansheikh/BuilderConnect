package com.builderconnect.dto.response;

import com.builderconnect.entity.TicketResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponseResponse {

    private Long id;
    private Long ticketId;
    private String message;
    private Boolean isInternal;
    private String attachments;
    private LocalDateTime createdAt;

    // User info
    private Long userId;
    private String userName;
    private String userRole;

    public static TicketResponseResponse fromEntity(TicketResponse response) {
        TicketResponseResponseBuilder builder = TicketResponseResponse.builder()
                .id(response.getId())
                .ticketId(response.getTicket().getId())
                .message(response.getMessage())
                .isInternal(response.getIsInternal())
                .attachments(response.getAttachments())
                .createdAt(response.getCreatedAt());

        if (response.getUser() != null) {
            builder.userId(response.getUser().getId())
                    .userName(response.getUser().getName())
                    .userRole(response.getUser().getRole().name());
        }

        return builder.build();
    }
}
