package com.builderconnect.dto.response;

import com.builderconnect.entity.SupportTicket;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportTicketResponse {

    private Long id;
    private String ticketNumber;
    private String category;
    private String priority;
    private String status;
    private String subject;
    private String description;
    private String resolution;
    private boolean escalated;
    private Long projectId;
    private Long orderId;
    private Integer satisfactionRating;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // User info
    private Long userId;
    private String userName;
    private String userEmail;

    // Response count
    private long responseCount;

    public static SupportTicketResponse fromEntity(SupportTicket ticket) {
        return fromEntity(ticket, 0);
    }

    public static SupportTicketResponse fromEntity(SupportTicket ticket, long responseCount) {
        SupportTicketResponseBuilder builder = SupportTicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .category(ticket.getCategory().name())
                .priority(ticket.getPriority().name())
                .status(ticket.getStatus().name())
                .subject(ticket.getSubject())
                .description(ticket.getDescription())
                .resolution(ticket.getResolution())
                .escalated(ticket.isEscalated())
                .projectId(ticket.getProjectId())
                .orderId(ticket.getOrderId())
                .satisfactionRating(ticket.getSatisfactionRating())
                .resolvedAt(ticket.getResolvedAt())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .responseCount(responseCount);

        if (ticket.getUser() != null) {
            builder.userId(ticket.getUser().getId())
                    .userName(ticket.getUser().getName())
                    .userEmail(ticket.getUser().getEmail());
        }

        return builder.build();
    }
}
