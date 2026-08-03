package com.builderconnect.dto.response;

import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for user response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String email;
    private String name;
    private String phone;
    private UserRole role;
    private String city;
    private String address;
    private String profileImageUrl;
    private Boolean active;
    private Boolean suspended;
    private String suspensionReason;
    private Boolean emailVerified;
    private Boolean twoFactorEnabled;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;

    // Role-specific data
    private BuilderProfileResponse builderProfile;
    private SupplierProfileResponse supplierProfile;

    public static UserResponse fromEntity(User user) {
        UserResponseBuilder builder = UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .name(user.getName())
            .phone(user.getPhone())
            .role(user.getRole())
            .city(user.getCity())
            .address(user.getAddress())
            .profileImageUrl(user.getProfileImageUrl())
            .active(user.getActive())
            .suspended(user.getSuspended())
            .suspensionReason(user.getSuspensionReason())
            .emailVerified(user.getEmailVerified())
            .twoFactorEnabled(user.getTwoFactorEnabled())
            .lastLogin(user.getLastLogin())
            .createdAt(user.getCreatedAt());

        if (user.getBuilderProfile() != null) {
            builder.builderProfile(BuilderProfileResponse.fromEntity(user.getBuilderProfile()));
        }

        if (user.getSupplierProfile() != null) {
            builder.supplierProfile(SupplierProfileResponse.fromEntity(user.getSupplierProfile()));
        }

        return builder.build();
    }

    public static UserResponse basicFromEntity(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .name(user.getName())
            .phone(user.getPhone())
            .role(user.getRole())
            .city(user.getCity())
            .profileImageUrl(user.getProfileImageUrl())
            .build();
    }
}
