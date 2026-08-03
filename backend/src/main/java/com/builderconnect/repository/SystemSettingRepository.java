package com.builderconnect.repository;

import com.builderconnect.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for SystemSetting entity operations.
 */
@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {

    Optional<SystemSetting> findBySettingKey(String settingKey);
}
