package com.builderconnect.service;

import com.builderconnect.entity.SystemSetting;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for system settings management. The typed getters are the single
 * runtime read path for admin-editable platform configuration.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingService {

    public static final String KEY_MAINTENANCE_MODE = "maintenance_mode";
    public static final String KEY_MAINTENANCE_MESSAGE = "maintenance_message";
    public static final String KEY_PLATFORM_NAME = "platform_name";
    public static final String KEY_SUPPORT_EMAIL = "support_email";
    public static final String KEY_SUPPORT_PHONE = "support_phone";
    public static final String KEY_MIN_BID_AMOUNT = "min_bid_amount";
    public static final String KEY_MAX_BID_AMOUNT = "max_bid_amount";
    public static final String KEY_DEFAULT_LEAD_CREDITS = "default_lead_credits";
    public static final String KEY_MAX_PROJECT_IMAGES = "max_project_images";
    public static final String KEY_BID_VALIDITY_DAYS = "bid_validity_days";
    public static final String KEY_CHATBOT_ENABLED = "chatbot_enabled";
    public static final String KEY_AI_ASSISTANT_ENABLED = "ai_assistant_enabled";

    private final SystemSettingRepository systemSettingRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public String getString(String key, String defaultValue) {
        return rawValue(key).orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public int getInt(String key, int defaultValue) {
        return rawValue(key).map(value -> {
            try {
                return Integer.parseInt(value);
            } catch (NumberFormatException e) {
                log.warn("Setting '{}' has non-integer value '{}'; using default {}", key, value, defaultValue);
                return defaultValue;
            }
        }).orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public BigDecimal getDecimal(String key, BigDecimal defaultValue) {
        return decimalValue(key).orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public boolean getBool(String key, boolean defaultValue) {
        return rawValue(key).map(Boolean::parseBoolean).orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllSettings() {
        return systemSettingRepository.findAll().stream()
                .map(this::toMap)
                .toList();
    }

    @Transactional
    public Map<String, Object> updateSetting(User admin, String key, String value) {
        SystemSetting setting = systemSettingRepository.findBySettingKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Setting not found: " + key));

        validateValue(setting, value);

        String oldValue = setting.getSettingValue();
        setting.setSettingValue(value.trim());
        setting.setUpdatedBy(admin.getId());
        systemSettingRepository.save(setting);

        auditService.logAction(admin, "SETTING_UPDATED", "SYSTEM_SETTING", setting.getId(),
                "Updated setting '" + key + "' from '" + oldValue + "' to '" + value + "'");

        log.info("Admin {} updated setting '{}' to '{}'", admin.getEmail(), key, value);

        return toMap(setting);
    }

    private void validateValue(SystemSetting setting, String value) {
        String key = setting.getSettingKey();
        if (value == null || value.isBlank()) {
            throw new BadRequestException("A value is required for setting '" + key + "'");
        }
        String trimmed = value.trim();
        switch (setting.getSettingType()) {
            case NUMBER -> validateNumber(key, trimmed);
            case BOOLEAN -> {
                if (!"true".equalsIgnoreCase(trimmed) && !"false".equalsIgnoreCase(trimmed)) {
                    throw new BadRequestException("Setting '" + key + "' must be 'true' or 'false'");
                }
            }
            default -> { /* STRING/JSON: any non-blank value */ }
        }
    }

    private void validateNumber(String key, String value) {
        BigDecimal number;
        try {
            number = new BigDecimal(value);
        } catch (NumberFormatException e) {
            throw new BadRequestException("Setting '" + key + "' must be a number");
        }

        switch (key) {
            case KEY_MIN_BID_AMOUNT -> {
                if (number.signum() <= 0) {
                    throw new BadRequestException("min_bid_amount must be greater than 0");
                }
                decimalValue(KEY_MAX_BID_AMOUNT).ifPresent(max -> {
                    if (number.compareTo(max) >= 0) {
                        throw new BadRequestException(
                                "min_bid_amount (" + number + ") must be less than max_bid_amount (" + max + ")");
                    }
                });
            }
            case KEY_MAX_BID_AMOUNT -> {
                if (number.signum() <= 0) {
                    throw new BadRequestException("max_bid_amount must be greater than 0");
                }
                decimalValue(KEY_MIN_BID_AMOUNT).ifPresent(min -> {
                    if (number.compareTo(min) <= 0) {
                        throw new BadRequestException(
                                "max_bid_amount (" + number + ") must be greater than min_bid_amount (" + min + ")");
                    }
                });
            }
            case KEY_DEFAULT_LEAD_CREDITS -> {
                requireWholeNumber(key, number);
                if (number.signum() < 0) {
                    throw new BadRequestException("default_lead_credits must be 0 or greater");
                }
            }
            case KEY_MAX_PROJECT_IMAGES -> {
                requireWholeNumber(key, number);
                requireRange(key, number, 1, 100);
            }
            case KEY_BID_VALIDITY_DAYS -> {
                requireWholeNumber(key, number);
                requireRange(key, number, 1, 365);
            }
            default -> { /* no per-key invariant */ }
        }
    }

    private void requireWholeNumber(String key, BigDecimal number) {
        if (number.stripTrailingZeros().scale() > 0) {
            throw new BadRequestException("Setting '" + key + "' must be a whole number");
        }
    }

    private void requireRange(String key, BigDecimal number, int min, int max) {
        if (number.compareTo(BigDecimal.valueOf(min)) < 0 || number.compareTo(BigDecimal.valueOf(max)) > 0) {
            throw new BadRequestException(key + " must be between " + min + " and " + max);
        }
    }

    private Optional<String> rawValue(String key) {
        return systemSettingRepository.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .filter(value -> !value.isBlank());
    }

    private Optional<BigDecimal> decimalValue(String key) {
        return rawValue(key).flatMap(value -> {
            try {
                return Optional.of(new BigDecimal(value));
            } catch (NumberFormatException e) {
                log.warn("Setting '{}' has non-numeric value '{}'", key, value);
                return Optional.empty();
            }
        });
    }

    private Map<String, Object> toMap(SystemSetting setting) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", setting.getId());
        map.put("key", setting.getSettingKey());
        map.put("value", setting.getSettingValue());
        map.put("type", setting.getSettingType());
        map.put("description", setting.getDescription());
        map.put("isPublic", setting.getIsPublic());
        map.put("updatedBy", setting.getUpdatedBy());
        map.put("updatedAt", setting.getUpdatedAt());
        return map;
    }
}
