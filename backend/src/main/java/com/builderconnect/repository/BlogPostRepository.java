package com.builderconnect.repository;

import com.builderconnect.entity.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    Optional<BlogPost> findBySlug(String slug);

    Optional<BlogPost> findBySlugAndIsPublishedTrue(String slug);

    Page<BlogPost> findByIsPublishedTrueOrderByPublishedAtDesc(Pageable pageable);

    Page<BlogPost> findByCategoryAndIsPublishedTrueOrderByPublishedAtDesc(String category, Pageable pageable);

    Page<BlogPost> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsBySlug(String slug);
}
