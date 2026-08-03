package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Reference entity for project categories (seeded in V2). Backs the real GET /v1/categories
 * endpoint so the create wizard no longer hardcodes a category list that drifts from the DB.
 */
@Entity
@Table(name = "project_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectCategory extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String icon;

    @Column(name = "display_order")
    private Integer displayOrder;
}
