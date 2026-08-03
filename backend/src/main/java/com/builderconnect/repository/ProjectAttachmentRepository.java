package com.builderconnect.repository;

import com.builderconnect.entity.ProjectAttachment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for ProjectAttachment entity operations.
 */
@Repository
public interface ProjectAttachmentRepository extends JpaRepository<ProjectAttachment, Long> {

    List<ProjectAttachment> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    Page<ProjectAttachment> findByProjectId(Long projectId, Pageable pageable);

    List<ProjectAttachment> findByProjectIdAndAttachmentType(Long projectId, ProjectAttachment.AttachmentType type);

    long countByProjectId(Long projectId);
}
