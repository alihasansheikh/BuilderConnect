package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Blog post entity for content marketing.
 */
@Entity
@Table(name = "blog_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogPost {

    public enum PostStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 300)
    private String slug;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 500)
    private String excerpt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(length = 100)
    private String category;

    @Column(columnDefinition = "JSON")
    private String tags;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PostStatus status = PostStatus.DRAFT;

    @Builder.Default
    @Column(name = "is_published")
    private Boolean isPublished = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Builder.Default
    @Column(name = "view_count")
    private Integer viewCount = 0;

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
        this.status = PostStatus.PUBLISHED;
        this.isPublished = true;
        this.publishedAt = LocalDateTime.now();
    }

    public void unpublish() {
        this.status = PostStatus.DRAFT;
        this.isPublished = false;
    }
}
