package com.builderconnect.service;

import com.builderconnect.entity.SystemSetting;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.SystemSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemSettingServiceTest {

    @Mock
    private SystemSettingRepository systemSettingRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private SystemSettingService systemSettingService;

    private User admin;

    @BeforeEach
    void setUp() {
        admin = User.builder()
                .email("admin@test.com")
                .name("Admin")
                .role(UserRole.ADMIN)
                .build();
        admin.setId(1L);
    }

    private SystemSetting setting(String key, String value, SystemSetting.SettingType type) {
        SystemSetting setting = SystemSetting.builder()
                .settingKey(key)
                .settingValue(value)
                .settingType(type)
                .build();
        setting.setId(7L);
        return setting;
    }

    @Test
    @DisplayName("updateSetting rejects a non-numeric value for a NUMBER setting")
    void updateSetting_NumberTypeWithNonNumericValue_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("max_project_images"))
                .thenReturn(Optional.of(setting("max_project_images", "20", SystemSetting.SettingType.NUMBER)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "max_project_images", "lots"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be a number");
        verify(systemSettingRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateSetting rejects min_bid_amount >= max_bid_amount")
    void updateSetting_MinBidAboveMax_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("min_bid_amount"))
                .thenReturn(Optional.of(setting("min_bid_amount", "1000", SystemSetting.SettingType.NUMBER)));
        when(systemSettingRepository.findBySettingKey("max_bid_amount"))
                .thenReturn(Optional.of(setting("max_bid_amount", "50000000", SystemSetting.SettingType.NUMBER)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "min_bid_amount", "60000000"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be less than max_bid_amount");
        verify(systemSettingRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateSetting rejects max_bid_amount <= min_bid_amount")
    void updateSetting_MaxBidBelowMin_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("max_bid_amount"))
                .thenReturn(Optional.of(setting("max_bid_amount", "50000000", SystemSetting.SettingType.NUMBER)));
        when(systemSettingRepository.findBySettingKey("min_bid_amount"))
                .thenReturn(Optional.of(setting("min_bid_amount", "1000", SystemSetting.SettingType.NUMBER)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "max_bid_amount", "500"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be greater than min_bid_amount");
        verify(systemSettingRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateSetting rejects a BOOLEAN value that is not true/false")
    void updateSetting_BooleanTypeWithInvalidValue_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("maintenance_mode"))
                .thenReturn(Optional.of(setting("maintenance_mode", "false", SystemSetting.SettingType.BOOLEAN)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "maintenance_mode", "yes"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be 'true' or 'false'");
        verify(systemSettingRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateSetting rejects max_project_images outside 1-100")
    void updateSetting_MaxProjectImagesOutOfRange_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("max_project_images"))
                .thenReturn(Optional.of(setting("max_project_images", "20", SystemSetting.SettingType.NUMBER)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "max_project_images", "101"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("between 1 and 100");
    }

    @Test
    @DisplayName("updateSetting rejects bid_validity_days outside 1-365")
    void updateSetting_BidValidityDaysOutOfRange_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("bid_validity_days"))
                .thenReturn(Optional.of(setting("bid_validity_days", "30", SystemSetting.SettingType.NUMBER)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "bid_validity_days", "0"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("between 1 and 365");
    }

    @Test
    @DisplayName("updateSetting rejects negative default_lead_credits")
    void updateSetting_NegativeLeadCredits_ShouldThrow() {
        when(systemSettingRepository.findBySettingKey("default_lead_credits"))
                .thenReturn(Optional.of(setting("default_lead_credits", "5", SystemSetting.SettingType.NUMBER)));

        assertThatThrownBy(() -> systemSettingService.updateSetting(admin, "default_lead_credits", "-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("0 or greater");
    }

    @Test
    @DisplayName("updateSetting saves a valid value and audit-logs the change")
    void updateSetting_WithValidValue_ShouldSaveAndAudit() {
        SystemSetting stored = setting("bid_validity_days", "30", SystemSetting.SettingType.NUMBER);
        when(systemSettingRepository.findBySettingKey("bid_validity_days"))
                .thenReturn(Optional.of(stored));
        when(systemSettingRepository.save(any(SystemSetting.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> result = systemSettingService.updateSetting(admin, "bid_validity_days", "45");

        assertThat(result.get("value")).isEqualTo("45");
        verify(auditService).logAction(eq(admin), eq("SETTING_UPDATED"), eq("SYSTEM_SETTING"), anyLong(), anyString());
    }

    @Test
    @DisplayName("getInt falls back to the default when the stored value is not numeric")
    void getInt_WithNonNumericValue_ShouldReturnDefault() {
        when(systemSettingRepository.findBySettingKey("bid_validity_days"))
                .thenReturn(Optional.of(setting("bid_validity_days", "soon", SystemSetting.SettingType.NUMBER)));

        assertThat(systemSettingService.getInt("bid_validity_days", 30)).isEqualTo(30);
    }

    @Test
    @DisplayName("typed getters fall back to defaults when the setting is missing")
    void typedGetters_WithMissingSetting_ShouldReturnDefaults() {
        when(systemSettingRepository.findBySettingKey(anyString())).thenReturn(Optional.empty());

        assertThat(systemSettingService.getBool("maintenance_mode", false)).isFalse();
        assertThat(systemSettingService.getString("platform_name", "BuilderConnect")).isEqualTo("BuilderConnect");
        assertThat(systemSettingService.getDecimal("min_bid_amount", new BigDecimal("1000")))
                .isEqualByComparingTo("1000");
        assertThat(systemSettingService.getInt("max_project_images", 20)).isEqualTo(20);
    }
}
