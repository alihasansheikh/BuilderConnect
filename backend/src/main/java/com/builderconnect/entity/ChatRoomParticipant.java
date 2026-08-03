package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing a participant in a chat room.
 * Note: chat_room_participants table has no created_at/updated_at columns,
 * so this entity does NOT extend BaseEntity.
 */
@Entity
@Table(name = "chat_room_participants", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"chat_room_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chat_room_id", nullable = false)
    private Long chatRoomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "joined_at")
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    @Builder.Default
    private ParticipantRole role = ParticipantRole.MEMBER;

    public enum ParticipantRole {
        OWNER, ADMIN, MEMBER, OBSERVER
    }

    @Column(name = "is_muted")
    @Builder.Default
    private Boolean isMuted = false;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
}
