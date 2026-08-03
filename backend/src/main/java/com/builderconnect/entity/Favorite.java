package com.builderconnect.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Favorite entity — a user's bookmark of a material or project.
 */
@Entity
@Table(name = "favorites", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "entity_type", "entity_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Favorite extends BaseEntity {

    public enum FavoriteEntityType {
        MATERIAL, PROJECT
    }

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 20)
    private FavoriteEntityType entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;
}
