package com.builderconnect.dto.response;

import com.builderconnect.entity.UserBadge;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBadgeResponse {

    private Long id;
    private Long userId;
    private String userName;

    // Badge info
    private Long badgeId;
    private String badgeName;
    private String badgeCode;
    private String badgeDescription;
    private String badgeIcon;
    private String badgeCategory;

    private LocalDateTime awardedAt;
    private Long awardedById;
    private String awardedByName;
    private String notes;

    public static UserBadgeResponse fromEntity(UserBadge userBadge) {
        UserBadgeResponseBuilder builder = UserBadgeResponse.builder()
                .id(userBadge.getId())
                .awardedAt(userBadge.getAwardedAt())
                .notes(userBadge.getNotes());

        if (userBadge.getUser() != null) {
            builder.userId(userBadge.getUser().getId())
                    .userName(userBadge.getUser().getName());
        }

        if (userBadge.getBadge() != null) {
            builder.badgeId(userBadge.getBadge().getId())
                    .badgeName(userBadge.getBadge().getName())
                    .badgeCode(userBadge.getBadge().getCode())
                    .badgeDescription(userBadge.getBadge().getDescription())
                    .badgeIcon(userBadge.getBadge().getIcon())
                    .badgeCategory(userBadge.getBadge().getCategory().name());
        }

        if (userBadge.getAwardedBy() != null) {
            builder.awardedById(userBadge.getAwardedBy().getId())
                    .awardedByName(userBadge.getAwardedBy().getName());
        }

        return builder.build();
    }
}
