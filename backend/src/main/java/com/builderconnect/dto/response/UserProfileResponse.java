package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Aggregate response for the public/self profile page (LinkedIn/Upwork style).
 *
 * <p>Contact fields ({@code phone}, {@code email}, {@code address}) are populated only when the
 * viewer is the profile owner or an admin; they read back {@code null} for everyone else. Portfolio
 * items and certifications are fetched by the frontend via their own endpoints and are NOT embedded
 * here; the aggregate embeds only {@code completedProjects}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private Long userId;
    private String name;
    private String role;
    private String city;
    private String profileImageUrl;
    private LocalDateTime memberSince;
    private String headline;

    // Contact — only exposed to the owner or an admin, otherwise null.
    private String phone;
    private String email;
    private String address;

    // Boolean (wrapper) so Lombok emits getIsOwnProfile() and Jackson keeps the JSON key
    // "isOwnProfile" (a primitive would serialize as "ownProfile").
    private Boolean isOwnProfile;

    // Role-specific extended profile maps (nullable when the role has no such profile).
    private Map<String, Object> builderProfile;
    private Map<String, Object> supplierProfile;

    // Denormalized rating summary (builder profiles).
    private Double averageRating;
    private Integer totalReviews;

    // Completed awarded projects, tiny shape: {id,title,categoryName,city,finalBudget,actualCompletionDate}.
    private List<Map<String, Object>> completedProjects;
}
