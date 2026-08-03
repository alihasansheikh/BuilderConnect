package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Announcement entity for platform-wide announcements.
 */
@Entity
@Table(name = "announcements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement extends BaseEntity {

    public enum AnnouncementType {
        INFO, WARNING, MAINTENANCE, PROMOTION, UPDATE
    }

    public enum DisplayPosition {
        TOP_BANNER, DASHBOARD, MODAL, SIDEBAR
    }

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "announcement_type")
    @Builder.Default
    private AnnouncementType announcementType = AnnouncementType.INFO;

    @Column(name = "target_roles", columnDefinition = "JSON")
    private String targetRoles;

    @Column(name = "target_cities", columnDefinition = "JSON")
    private String targetCities;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_dismissible")
    private Boolean isDismissible = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "display_position")
    @Builder.Default
    private DisplayPosition displayPosition = DisplayPosition.DASHBOARD;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Builder.Default
    @Column(name = "view_count")
    private Integer viewCount = 0;

    @Builder.Default
    @Column(name = "click_count")
    private Integer clickCount = 0;

    @Column(name = "created_by")
    private Long createdBy;
}
