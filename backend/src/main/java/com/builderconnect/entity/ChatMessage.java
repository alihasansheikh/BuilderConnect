package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Chat message entity for individual messages in chat rooms.
 * Note: chat_messages table has created_at but NO updated_at column,
 * so this entity does NOT extend BaseEntity.
 */
@Entity
@Table(name = "chat_messages")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum MessageType {
        TEXT, IMAGE, FILE, SYSTEM, MILESTONE_UPDATE, PAYMENT_NOTIFICATION
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type")
    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    @Column(name = "attachment_type", length = 50)
    private String attachmentType;

    @Column(name = "attachment_size")
    private Long attachmentSize;

    @Column(name = "reply_to_id")
    private Long replyToId;

    @Builder.Default
    @Column(name = "is_edited")
    private Boolean isEdited = false;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Builder.Default
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(columnDefinition = "JSON")
    private String metadata;

    public void edit(String newContent) {
        this.content = newContent;
        this.isEdited = true;
        this.editedAt = LocalDateTime.now();
    }

    public void softDelete() {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.content = "This message has been deleted";
    }

    public String getPreview() {
        if (isDeleted) return "Message deleted";
        if (messageType == MessageType.IMAGE) return "Sent an image";
        if (messageType == MessageType.FILE) return "Sent a file";
        if (content == null) return "";
        return content.length() > 50 ? content.substring(0, 47) + "..." : content;
    }
}
