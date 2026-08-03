package com.builderconnect.repository;

import com.builderconnect.entity.ProjectCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for project categories (reference data).
 */
@Repository
public interface ProjectCategoryRepository extends JpaRepository<ProjectCategory, Long> {

    List<ProjectCategory> findAllByOrderByDisplayOrderAsc();
}
