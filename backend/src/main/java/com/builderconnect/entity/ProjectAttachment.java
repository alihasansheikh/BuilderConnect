package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Project attachment entity for files attached to projects.
 */
@Entity
@Table(name = "project_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectAttachment extends BaseEntity {

    public enum AttachmentType {
        REQUIREMENT, DESIGN, CONTRACT, PROGRESS, OTHER
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "attachment_type")
    @Builder.Default
    private AttachmentType attachmentType = AttachmentType.OTHER;
}
