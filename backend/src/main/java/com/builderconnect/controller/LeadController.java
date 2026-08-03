package com.builderconnect.controller;

import com.builderconnect.dto.response.LeadTransactionResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for builder lead credit management.
 */
@RestController
@RequestMapping("/v1/builder/leads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BUILDER')")
@Tag(name = "Lead Management", description = "Builder lead credit endpoints")
public class LeadController {

    private final LeadService leadService;

    @GetMapping("/credits")
    @Operation(summary = "Get current lead credit balance")
    public ResponseEntity<Map<String, Object>> getCreditBalance(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(leadService.getLeadCreditBalance(user));
    }

    @GetMapping("/transactions")
    @Operation(summary = "Get lead credit transaction history")
    public ResponseEntity<Page<LeadTransactionResponse>> getTransactions(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(leadService.getLeadTransactions(user, pageable));
    }
}
