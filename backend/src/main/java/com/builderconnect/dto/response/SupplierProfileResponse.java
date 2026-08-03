package com.builderconnect.dto.response;

import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.enums.VerificationStatus;
import com.builderconnect.util.JsonUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO for supplier profile response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierProfileResponse {

    private Long id;
    private Long userId;
    private String companyName;
    private String businessRegistrationNumber;
    private String taxId;
    private String description;
    private List<String> categories;
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
    private VerificationStatus verificationStatus;
    private LocalDateTime verificationRequestedAt;
    private String verificationRejectionReason;
    private String warehouseAddress;
    private List<String> deliveryAreas;
    private BigDecimal minimumOrderValue;
    private Integer totalOrdersCompleted;
    private BigDecimal averageRating;
    private Integer totalReviews;

    public static SupplierProfileResponse fromEntity(SupplierProfile profile) {
        return SupplierProfileResponse.builder()
            .id(profile.getId())
            .userId(profile.getUser().getId())
            .companyName(profile.getCompanyName())
            .businessRegistrationNumber(profile.getBusinessRegistrationNumber())
            .taxId(profile.getTaxId())
            .description(profile.getDescription())
            .categories(parseJsonArray(profile.getCategories()))
            .isVerified(profile.getIsVerified())
            .verifiedAt(profile.getVerifiedAt())
            .verificationStatus(profile.getVerificationStatus())
            .verificationRequestedAt(profile.getVerificationRequestedAt())
            .verificationRejectionReason(profile.getVerificationRejectionReason())
            .warehouseAddress(profile.getWarehouseAddress())
            .deliveryAreas(parseJsonArray(profile.getDeliveryAreas()))
            .minimumOrderValue(profile.getMinimumOrderValue())
            .totalOrdersCompleted(profile.getTotalOrdersCompleted())
            .averageRating(profile.getAverageRating())
            .totalReviews(profile.getTotalReviews())
            .build();
    }

    private static List<String> parseJsonArray(String json) {
        // Delegates to the shared helper, which also unwraps the double-encoded form these
        // JSON columns read back as (a single parse silently returned an empty list).
        return JsonUtils.parseStringArray(json);
    }
}
