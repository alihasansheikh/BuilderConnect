package com.builderconnect.service;

import com.builderconnect.dto.request.FloorPlanBrief;
import com.builderconnect.dto.request.FloorPlanBrief.KitchenType;
import com.builderconnect.dto.request.FloorPlanBrief.PlotUnit;
import com.builderconnect.dto.response.FloorPlanResponse;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.service.llm.LlmClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FloorPlanServiceTest {

    private static final String SAMPLE_PLAN = "{\"plotWidthFt\":25,\"plotLengthFt\":45,\"rooms\":[]}";

    @Mock private LlmClient llmClient;
    @Mock private SystemSettingService systemSettingService;
    @Mock private User user;

    private FloorPlanService service;

    @BeforeEach
    void setUp() {
        service = new FloorPlanService(llmClient, systemSettingService);
        when(llmClient.isConfigured()).thenReturn(true);
        when(systemSettingService.getBool(eq(SystemSettingService.KEY_AI_ASSISTANT_ENABLED), anyBoolean()))
                .thenReturn(true);
        when(user.getSuspended()).thenReturn(false);
        when(llmClient.generateJson(anyString(), anyList(), anyMap(), any())).thenReturn(SAMPLE_PLAN);
    }

    private FloorPlanBrief brief() {
        return new FloorPlanBrief(5.0, PlotUnit.MARLA, 3, 2, KitchenType.OPEN, true, true, "big lounge");
    }

    @Test
    @DisplayName("generate returns the model's JSON verbatim and calls the LLM once")
    void generate_happyPath() {
        FloorPlanResponse res = service.generate(user, brief());

        assertThat(res.planJson()).isEqualTo(SAMPLE_PLAN);
        verify(llmClient, times(1)).generateJson(anyString(), anyList(), anyMap(), any());
    }

    @Test
    @DisplayName("generate rejects when the kill-switch is off")
    void generate_disabled() {
        when(systemSettingService.getBool(eq(SystemSettingService.KEY_AI_ASSISTANT_ENABLED), anyBoolean()))
                .thenReturn(false);

        assertThatThrownBy(() -> service.generate(user, brief())).isInstanceOf(BadRequestException.class);
        verify(llmClient, never()).generateJson(anyString(), anyList(), anyMap(), any());
    }

    @Test
    @DisplayName("generate rejects when no LLM key is configured")
    void generate_keyless() {
        when(llmClient.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.generate(user, brief())).isInstanceOf(BadRequestException.class);
        verify(llmClient, never()).generateJson(anyString(), anyList(), anyMap(), any());
    }

    @Test
    @DisplayName("generate rejects a suspended user")
    void generate_suspended() {
        when(user.getSuspended()).thenReturn(true);

        assertThatThrownBy(() -> service.generate(user, brief())).isInstanceOf(UnauthorizedException.class);
        verify(llmClient, never()).generateJson(anyString(), anyList(), anyMap(), any());
    }

    @Test
    @DisplayName("generate builds a prompt carrying the requested room counts and a JSON schema")
    @SuppressWarnings("unchecked")
    void generate_promptCarriesRequirements() {
        ArgumentCaptor<String> systemInstruction = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Map<String, Object>> schema = ArgumentCaptor.forClass(Map.class);
        when(llmClient.generateJson(systemInstruction.capture(), anyList(), schema.capture(), any()))
                .thenReturn(SAMPLE_PLAN);

        service.generate(user, brief());

        String prompt = systemInstruction.getValue();
        assertThat(prompt).contains("Bedrooms: 3");
        assertThat(prompt).contains("Bathrooms: 2");
        assertThat(prompt).contains("SINGLE-STOREY");

        Map<String, Object> responseSchema = schema.getValue();
        assertThat(responseSchema).containsEntry("type", "object");
        assertThat(responseSchema).containsKey("properties");
    }
}
