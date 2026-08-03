package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * System setting entity for platform configuration.
 */
@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting {

    public enum SettingType {
        STRING, NUMBER, BOOLEAN, JSON
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false, unique = true, length = 100)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "setting_type")
    @Builder.Default
    private SettingType settingType = SettingType.STRING;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(name = "is_public")
    private Boolean isPublic = false;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public String getValueAsString() {
        return settingValue;
    }

    public Integer getValueAsInteger() {
        return settingValue != null ? Integer.parseInt(settingValue) : null;
    }

    public Boolean getValueAsBoolean() {
        return settingValue != null ? Boolean.parseBoolean(settingValue) : null;
    }

    public Double getValueAsDouble() {
        return settingValue != null ? Double.parseDouble(settingValue) : null;
    }
}
