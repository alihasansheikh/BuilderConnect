package com.builderconnect.repository;

import com.builderconnect.entity.MaterialCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaterialCategoryRepository extends JpaRepository<MaterialCategory, Long> {

    List<MaterialCategory> findByParentIdIsNullOrderBySortOrderAsc();

    List<MaterialCategory> findByParentIdOrderBySortOrderAsc(Long parentId);
}
