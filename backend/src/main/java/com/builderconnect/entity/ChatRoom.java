package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Chat room entity for messaging between users.
 */
@Entity
@Table(name = "chat_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom extends BaseEntity {

    public enum RoomType {
        PROJECT, BID, SUPPORT, DIRECT, GROUP
    }

    @Column(name = "room_code", nullable = false, unique = true, length = 50)
    private String roomCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false)
    private RoomType roomType;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "bid_id")
    private Long bidId;

    @Column(name = "support_ticket_id")
    private Long supportTicketId;

    @Column(length = 200)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "created_by")
    private Long createdBy;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_archived")
    private Boolean isArchived = false;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "last_message_preview", length = 200)
    private String lastMessagePreview;

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();

    public void updateLastMessage(String preview) {
        this.lastMessageAt = LocalDateTime.now();
        this.lastMessagePreview = preview != null && preview.length() > 200
            ? preview.substring(0, 197) + "..."
            : preview;
    }
}
