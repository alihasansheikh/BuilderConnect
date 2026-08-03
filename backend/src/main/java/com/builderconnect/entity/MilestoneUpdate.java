package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Milestone update entity tracking progress updates on milestones.
 */
@Entity
@Table(name = "milestone_updates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneUpdate extends BaseEntity {

    public enum UpdateType {
        PROGRESS, NOTE, ISSUE, PHOTO, COMPLETION_REQUEST
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "update_type", nullable = false)
    @Builder.Default
    private UpdateType updateType = UpdateType.PROGRESS;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "progress_percentage")
    private Integer progressPercentage;

    @Column(columnDefinition = "JSON")
    private String attachments;
}
