package com.builderconnect.service;

import com.builderconnect.dto.request.ChatbotRequest;
import com.builderconnect.dto.response.ChatbotResponse;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.LlmUnavailableException;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChatbotServiceTest {

    @Mock
    private LlmClient llmClient;
    @Mock
    private SystemSettingService systemSettingService;

    private ChatbotService service;

    @BeforeEach
    void setUp() {
        service = new ChatbotService(llmClient, systemSettingService);
        when(llmClient.isConfigured()).thenReturn(true);
        when(systemSettingService.getBool(eq(SystemSettingService.KEY_CHATBOT_ENABLED), anyBoolean()))
                .thenReturn(true);
        when(systemSettingService.getString(eq(SystemSettingService.KEY_SUPPORT_EMAIL), anyString()))
                .thenReturn("support@builderconnect.pk");
        when(systemSettingService.getString(eq(SystemSettingService.KEY_SUPPORT_PHONE), anyString()))
                .thenReturn("");
    }

    @Test
    @DisplayName("returns the model's reply on the happy path")
    void answer_returnsModelReply() {
        when(llmClient.generateText(anyString(), any(), any())).thenReturn("**Steps:** ...");

        ChatbotResponse res = service.answer(new ChatbotRequest("How do I create a project?", null));

        assertThat(res.answer()).contains("Steps");
        verify(llmClient).generateText(anyString(), any(), any());
    }

    @Test
    @DisplayName("appends the question as the final user turn after history")
    @SuppressWarnings("unchecked")
    void answer_appendsQuestionAsFinalUserTurn() {
        ArgumentCaptor<List<LlmClient.ChatTurn>> captor = ArgumentCaptor.forClass(List.class);
        when(llmClient.generateText(anyString(), captor.capture(), any())).thenReturn("ok");

        service.answer(new ChatbotRequest("Hello?", List.of(
                new ChatbotRequest.Turn("user", "hi"),
                new ChatbotRequest.Turn("assistant", "hey"))));

        List<LlmClient.ChatTurn> turns = captor.getValue();
        assertThat(turns).hasSize(3);
        assertThat(turns.get(2).role()).isEqualTo("user");
        assertThat(turns.get(2).content()).isEqualTo("Hello?");
    }

    @Test
    @DisplayName("rejects when no Gemini key is configured")
    void answer_keyless_throwsBadRequest() {
        when(llmClient.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.answer(new ChatbotRequest("hi", null)))
                .isInstanceOf(BadRequestException.class);
        verify(llmClient, never()).generateText(anyString(), any(), any());
    }

    @Test
    @DisplayName("rejects when the kill-switch is off")
    void answer_disabled_throwsBadRequest() {
        when(systemSettingService.getBool(eq(SystemSettingService.KEY_CHATBOT_ENABLED), anyBoolean()))
                .thenReturn(false);

        assertThatThrownBy(() -> service.answer(new ChatbotRequest("hi", null)))
                .isInstanceOf(BadRequestException.class);
        verify(llmClient, never()).generateText(anyString(), any(), any());
    }

    @Test
    @DisplayName("rejects a blank question")
    void answer_blankQuestion_throwsBadRequest() {
        assertThatThrownBy(() -> service.answer(new ChatbotRequest("   ", null)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("propagates LlmUnavailableException so it maps to 503")
    void answer_llmError_propagates() {
        when(llmClient.generateText(anyString(), any(), any()))
                .thenThrow(new LlmUnavailableException("down"));

        assertThatThrownBy(() -> service.answer(new ChatbotRequest("hi", null)))
                .isInstanceOf(LlmUnavailableException.class);
    }
}
