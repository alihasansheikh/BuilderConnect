package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Material category entity for organizing materials.
 * Note: material_categories table has created_at but NO updated_at column,
 * so this entity does NOT extend BaseEntity.
 */
@Entity
@Table(name = "material_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(length = 50)
    private String icon;

    @Builder.Default
    @Column(name = "display_order")
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
