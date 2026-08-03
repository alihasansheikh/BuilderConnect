package com.builderconnect.repository;

import com.builderconnect.entity.Badge;
import com.builderconnect.entity.Badge.BadgeCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Optional<Badge> findByCode(String code);

    List<Badge> findByIsActiveTrue();

    List<Badge> findByCategory(BadgeCategory category);
}
