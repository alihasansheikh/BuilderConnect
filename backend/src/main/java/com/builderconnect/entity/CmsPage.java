package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * CMS Page entity for static content management.
 */
@Entity
@Table(name = "cms_pages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CmsPage {

    public enum PageStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "meta_description", length = 500)
    private String metaDescription;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PageStatus status = PageStatus.DRAFT;

    @Builder.Default
    @Column(name = "is_published")
    private Boolean isPublished = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void publish() {
        this.status = PageStatus.PUBLISHED;
        this.isPublished = true;
        this.publishedAt = LocalDateTime.now();
    }

    public void unpublish() {
        this.status = PageStatus.DRAFT;
        this.isPublished = false;
    }
}
