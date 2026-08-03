package com.builderconnect.dto.response;

import com.builderconnect.entity.MaterialCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for material category listing (marketplace filter UI).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialCategoryResponse {

    private Long id;
    private String name;
    private String icon;
    private Integer displayOrder;

    public static MaterialCategoryResponse fromEntity(MaterialCategory category) {
        return MaterialCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .icon(category.getIcon())
                .displayOrder(category.getSortOrder())
                .build();
    }
}
