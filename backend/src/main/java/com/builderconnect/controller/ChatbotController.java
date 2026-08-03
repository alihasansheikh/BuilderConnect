package com.builderconnect.controller;

import com.builderconnect.dto.request.ChatbotRequest;
import com.builderconnect.dto.response.ChatbotResponse;
import com.builderconnect.service.ChatbotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public FAQ assistant endpoint. Auto-public via the SecurityConfig
 * /v1/public/** permitAll rule; rate-limited by a dedicated bucket in
 * RateLimitFilter.
 */
@RestController
@RequestMapping("/v1/public/chatbot")
@RequiredArgsConstructor
@Tag(name = "Public Chatbot", description = "Public FAQ assistant")
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/ask")
    @Operation(summary = "Ask the public FAQ assistant a question")
    public ResponseEntity<ChatbotResponse> ask(@Valid @RequestBody ChatbotRequest request) {
        return ResponseEntity.ok(chatbotService.answer(request));
    }
}
