package com.builderconnect.service;

import com.builderconnect.dto.response.AiMessageResponse;
import com.builderconnect.entity.AiMessage;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.AiMessageRepository;
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

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiAssistantServiceTest {

    @Mock private LlmClient llmClient;
    @Mock private SystemSettingService systemSettingService;
    @Mock private AiMessageRepository aiMessageRepository;
    @Mock private User user;

    private AiAssistantService service;

    @BeforeEach
    void setUp() {
        service = new AiAssistantService(llmClient, systemSettingService, aiMessageRepository);
        when(llmClient.isConfigured()).thenReturn(true);
        when(systemSettingService.getBool(eq(SystemSettingService.KEY_AI_ASSISTANT_ENABLED), anyBoolean()))
                .thenReturn(true);
        when(user.getId()).thenReturn(1L);
        when(user.getName()).thenReturn("Ali");
        when(user.getRole()).thenReturn(UserRole.BUILDER);
        when(user.getCity()).thenReturn("Lahore");
        when(user.getSuspended()).thenReturn(false);
        when(aiMessageRepository.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(new ArrayList<>());
        when(aiMessageRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("sendMessage returns the assistant reply and persists the exchange")
    void sendMessage_happyPath() {
        when(llmClient.generateText(anyString(), any(), any())).thenReturn("Here are the steps...");

        AiMessageResponse res = service.sendMessage(user, "How do I award a bid?");

        assertThat(res.role()).isEqualTo("ASSISTANT");
        assertThat(res.content()).isEqualTo("Here are the steps...");
        verify(llmClient).generateText(anyString(), any(), any());
        verify(aiMessageRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("sendMessage appends the new question as the final user turn, windowed to recent history")
    @SuppressWarnings("unchecked")
    void sendMessage_windowsHistory() {
        List<AiMessage> thread = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            thread.add(AiMessage.builder()
                    .role(i % 2 == 0 ? AiMessage.MessageRole.USER : AiMessage.MessageRole.ASSISTANT)
                    .content("m" + i).build());
        }
        when(aiMessageRepository.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(thread);
        ArgumentCaptor<List<LlmClient.ChatTurn>> captor = ArgumentCaptor.forClass(List.class);
        when(llmClient.generateText(anyString(), captor.capture(), any())).thenReturn("ok");

        service.sendMessage(user, "latest question");

        List<LlmClient.ChatTurn> turns = captor.getValue();
        assertThat(turns).hasSize(13); // last 12 of the thread + the new user turn
        assertThat(turns.get(12).role()).isEqualTo("user");
        assertThat(turns.get(12).content()).isEqualTo("latest question");
    }

    @Test
    @DisplayName("sendMessage grounds the model on the Floor Plan Studio hand-off")
    void sendMessage_mentionsFloorPlanTool() {
        ArgumentCaptor<String> systemCaptor = ArgumentCaptor.forClass(String.class);
        when(llmClient.generateText(systemCaptor.capture(), any(), any())).thenReturn("ok");

        service.sendMessage(user, "design a 5 marla house");

        assertThat(systemCaptor.getValue()).contains("Floor Plan Studio");
    }

    @Test
    @DisplayName("sendMessage rejects when the kill-switch is off")
    void sendMessage_disabled() {
        when(systemSettingService.getBool(eq(SystemSettingService.KEY_AI_ASSISTANT_ENABLED), anyBoolean()))
                .thenReturn(false);

        assertThatThrownBy(() -> service.sendMessage(user, "hi")).isInstanceOf(BadRequestException.class);
        verify(llmClient, never()).generateText(anyString(), any(), any());
    }

    @Test
    @DisplayName("sendMessage rejects when no Gemini key is configured")
    void sendMessage_keyless() {
        when(llmClient.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.sendMessage(user, "hi")).isInstanceOf(BadRequestException.class);
        verify(llmClient, never()).generateText(anyString(), any(), any());
    }

    @Test
    @DisplayName("sendMessage rejects a suspended user")
    void sendMessage_suspended() {
        when(user.getSuspended()).thenReturn(true);

        assertThatThrownBy(() -> service.sendMessage(user, "hi")).isInstanceOf(UnauthorizedException.class);
        verify(llmClient, never()).generateText(anyString(), any(), any());
    }

    @Test
    @DisplayName("getThread reports availability and maps the caller's messages")
    void getThread_returnsThread() {
        when(aiMessageRepository.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(
                AiMessage.builder().role(AiMessage.MessageRole.USER).content("hi").build()));

        var thread = service.getThread(user);

        assertThat(thread.enabled()).isTrue();
        assertThat(thread.messages()).hasSize(1);
        assertThat(thread.messages().get(0).role()).isEqualTo("USER");
    }

    @Test
    @DisplayName("clearThread deletes only the caller's messages")
    void clearThread_deletesOwn() {
        service.clearThread(user);
        verify(aiMessageRepository).deleteByUserId(1L);
    }
}
