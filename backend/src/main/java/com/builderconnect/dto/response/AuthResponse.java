package com.builderconnect.dto.response;

import com.builderconnect.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for authentication response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserInfo user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String email;
        private String name;
        private UserRole role;
        private String profileImageUrl;
        private Boolean emailVerified;
        private Boolean twoFactorEnabled;
        private String phone;
        private String city;
        private String address;
        // Role-specific profile summaries — the frontend dashboards read these directly.
        private BuilderProfileInfo builderProfile;
        private SupplierProfileInfo supplierProfile;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BuilderProfileInfo {
        private Integer leadCredits;
        private BigDecimal averageRating;
        private Integer totalProjectsCompleted;
        private BigDecimal totalEarnings;
        private String subscriptionTier;
        private Boolean isVerified;
        private String companyName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupplierProfileInfo {
        private Boolean isVerified;
        private BigDecimal averageRating;
        private String companyName;
    }

    public static AuthResponse of(String accessToken, String refreshToken, Long expiresIn, UserInfo user) {
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(expiresIn)
            .user(user)
            .build();
    }
}
