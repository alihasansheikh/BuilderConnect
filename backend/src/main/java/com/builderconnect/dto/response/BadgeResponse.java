package com.builderconnect.dto.response;

import com.builderconnect.entity.Badge;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeResponse {

    private Long id;
    private String name;
    private String code;
    private String description;
    private String icon;
    private String category;
    private String criteriaType;
    private Integer leadCreditBonus;
    private Boolean isActive;
    private String applicableRoles;
    private LocalDateTime createdAt;

    public static BadgeResponse fromEntity(Badge badge) {
        return BadgeResponse.builder()
                .id(badge.getId())
                .name(badge.getName())
                .code(badge.getCode())
                .description(badge.getDescription())
                .icon(badge.getIcon())
                .category(badge.getCategory().name())
                .criteriaType(badge.getCriteriaType().name())
                .leadCreditBonus(badge.getLeadCreditBonus())
                .isActive(badge.getIsActive())
                .applicableRoles(badge.getApplicableRoles())
                .createdAt(badge.getCreatedAt())
                .build();
    }
}
