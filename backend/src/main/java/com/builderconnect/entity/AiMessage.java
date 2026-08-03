package com.builderconnect.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * One message in a user's ongoing AI Assistant thread (user↔model).
 * There is a single continuous thread per user — the "conversation" is simply
 * all of a user's messages ordered by createdAt.
 */
@Entity
@Table(name = "ai_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiMessage extends BaseEntity {

    public enum MessageRole {
        USER, ASSISTANT
    }

    // Owner — @JsonIgnore: the API already scopes queries to the caller.
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MessageRole role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
}
