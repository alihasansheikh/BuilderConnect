package com.builderconnect.dto.response;

import com.builderconnect.entity.PortfolioItem;
import com.builderconnect.util.JsonUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for a portfolio item response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioItemResponse {

    private Long id;
    private Long userId;
    private String title;
    private String description;
    private List<String> images;
    private BigDecimal projectCost;
    private Integer durationDays;
    private Integer year;
    private String externalUrl;
    private LocalDateTime createdAt;

    public static PortfolioItemResponse fromEntity(PortfolioItem item) {
        return PortfolioItemResponse.builder()
                .id(item.getId())
                .userId(item.getUserId())
                .title(item.getTitle())
                .description(item.getDescription())
                .images(JsonUtils.parseStringArray(item.getImages()))
                .projectCost(item.getProjectCost())
                .durationDays(item.getDurationDays())
                .year(item.getYear())
                .externalUrl(item.getExternalUrl())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
