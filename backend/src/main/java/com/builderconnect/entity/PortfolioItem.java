package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * A portfolio/showcase item on a user's LinkedIn/Upwork-style profile.
 * Keyed on {@code user_id} (the builder) so it extends to other roles without a schema change.
 */
@Entity
@Table(name = "portfolio_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioItem extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** JSON array of "/uploads/portfolio/..." urls; read back via {@code JsonUtils.parseStringArray}. */
    @Column(columnDefinition = "JSON")
    private String images;

    @Column(name = "project_cost", precision = 15, scale = 2)
    private BigDecimal projectCost;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "project_year")
    private Integer year;

    @Column(name = "external_url", length = 500)
    private String externalUrl;

    @Builder.Default
    @Column(name = "display_order")
    private Integer displayOrder = 0;
}
