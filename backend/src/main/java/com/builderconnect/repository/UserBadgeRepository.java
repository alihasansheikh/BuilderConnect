package com.builderconnect.repository;

import com.builderconnect.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {

    List<UserBadge> findByUserId(Long userId);

    List<UserBadge> findByBadgeId(Long badgeId);

    boolean existsByUserIdAndBadgeId(Long userId, Long badgeId);
}
