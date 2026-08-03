package com.builderconnect.repository;

import com.builderconnect.entity.CmsPage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CmsPageRepository extends JpaRepository<CmsPage, Long> {

    Optional<CmsPage> findBySlug(String slug);

    Optional<CmsPage> findBySlugAndIsPublishedTrue(String slug);

    Page<CmsPage> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsBySlug(String slug);
}
