package com.builderconnect.controller;

import com.builderconnect.service.SystemSettingService;
import com.builderconnect.service.llm.LlmClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Public (unauthenticated) platform settings. This is the real runtime
 * consumer of the admin-editable system_settings rows: the maintenance
 * banner/message and the contact details rendered in the public footer.
 */
@RestController
@RequestMapping("/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public Settings", description = "Public platform settings")
public class PublicSettingsController {

    private static final String DEFAULT_MAINTENANCE_MESSAGE =
            "BuilderConnect is undergoing scheduled maintenance. Some features may be temporarily unavailable.";

    private final SystemSettingService systemSettingService;
    private final LlmClient llmClient;

    @GetMapping("/settings")
    @Operation(summary = "Get public platform settings (maintenance banner, contact info)")
    public ResponseEntity<Map<String, Object>> getPublicSettings() {
        Map<String, Object> settings = new HashMap<>();
        settings.put("maintenanceBanner",
                systemSettingService.getBool(SystemSettingService.KEY_MAINTENANCE_MODE, false));
        settings.put("maintenanceMessage",
                systemSettingService.getString(SystemSettingService.KEY_MAINTENANCE_MESSAGE, DEFAULT_MAINTENANCE_MESSAGE));
        settings.put("supportEmail",
                systemSettingService.getString(SystemSettingService.KEY_SUPPORT_EMAIL, "support@builderconnect.pk"));
        settings.put("supportPhone",
                systemSettingService.getString(SystemSettingService.KEY_SUPPORT_PHONE, ""));
        settings.put("platformName",
                systemSettingService.getString(SystemSettingService.KEY_PLATFORM_NAME, "BuilderConnect"));
        // The widget shows only when the admin toggle is on AND an LLM provider key is configured.
        settings.put("chatbotEnabled",
                systemSettingService.getBool(SystemSettingService.KEY_CHATBOT_ENABLED, true)
                        && llmClient.isConfigured());
        return ResponseEntity.ok(settings);
    }
}
