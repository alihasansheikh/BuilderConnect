package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Badge entity representing achievements and verification badges that can be awarded to users.
 */
@Entity
@Table(name = "badges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge extends BaseEntity {

    public enum BadgeCategory {
        ACHIEVEMENT, VERIFICATION, MILESTONE, LOYALTY, SPECIAL
    }

    public enum CriteriaType {
        AUTOMATIC, MANUAL, VERIFICATION
    }

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String icon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BadgeCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "criteria_type", nullable = false)
    @Builder.Default
    private CriteriaType criteriaType = CriteriaType.AUTOMATIC;

    @Column(name = "criteria_config", columnDefinition = "TEXT")
    private String criteriaConfig;

    @Column(name = "lead_credit_bonus")
    @Builder.Default
    private Integer leadCreditBonus = 0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "applicable_roles", columnDefinition = "TEXT")
    private String applicableRoles;
}
