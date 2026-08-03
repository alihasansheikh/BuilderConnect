package com.builderconnect.controller;

import com.builderconnect.dto.request.AssistantMessageRequest;
import com.builderconnect.dto.response.AiMessageResponse;
import com.builderconnect.dto.response.AssistantThreadResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.AiAssistantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Authenticated AI Assistant. Access is limited to CLIENT/BUILDER via the
 * SecurityConfig /v1/assistant/** rule; every handler operates only on the
 * caller's own single thread.
 */
@RestController
@RequestMapping("/v1/assistant")
@RequiredArgsConstructor
@Tag(name = "AI Assistant", description = "Authenticated construction assistant (clients + builders)")
public class AssistantController {

    private final AiAssistantService aiAssistantService;

    @GetMapping("/messages")
    @Operation(summary = "Get my assistant thread (+ availability)")
    public ResponseEntity<AssistantThreadResponse> getThread(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(aiAssistantService.getThread(user));
    }

    @PostMapping("/messages")
    @Operation(summary = "Send a message to the assistant")
    public ResponseEntity<AiMessageResponse> send(@AuthenticationPrincipal User user,
                                                  @Valid @RequestBody AssistantMessageRequest request) {
        return ResponseEntity.ok(aiAssistantService.sendMessage(user, request.message()));
    }

    @DeleteMapping("/messages")
    @Operation(summary = "Clear my assistant thread")
    public ResponseEntity<Void> clear(@AuthenticationPrincipal User user) {
        aiAssistantService.clearThread(user);
        return ResponseEntity.noContent().build();
    }
}
