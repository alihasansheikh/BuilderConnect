package com.builderconnect.controller;

import com.builderconnect.dto.request.ContractDraftRequest;
import com.builderconnect.dto.response.ContractResponse;
import com.builderconnect.dto.response.ContractVersionResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.ContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for contract operations. The awarded builder authors and edits the
 * contract; both parties sign it; either party (or an admin) can view/download it.
 */
@RestController
@RequestMapping("/v1/projects/{projectId}/contract")
@RequiredArgsConstructor
@Tag(name = "Contracts", description = "Contract management endpoints")
public class ContractController {

    private final ContractService contractService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get contract for a project (parties and admins only)")
    public ResponseEntity<?> getContract(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        Optional<ContractResponse> contract = contractService.getContractByProject(user, projectId);
        if (contract.isPresent()) {
            return ResponseEntity.ok(contract.get());
        }
        return ResponseEntity.ok(Collections.singletonMap("message", "No contract generated yet for this project"));
    }

    @PostMapping
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Draft the contract (awarded builder only; total locked to awarded bid)")
    public ResponseEntity<ContractResponse> createContract(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @Valid @RequestBody ContractDraftRequest request) {
        ContractResponse response = contractService.createContract(user, projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Edit contract terms (awarded builder only; blocked once any party signs)")
    public ResponseEntity<ContractResponse> updateContract(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @Valid @RequestBody ContractDraftRequest request) {
        return ResponseEntity.ok(contractService.updateContract(user, projectId, request));
    }

    @GetMapping("/pdf")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Download the contract as a PDF (parties and admins only)")
    public ResponseEntity<byte[]> downloadContractPdf(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        ContractService.ContractPdfFile pdf = contractService.generateContractPdf(user, projectId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=contract-" + pdf.contractNumber() + ".pdf")
                .body(pdf.content());
    }

    @PostMapping("/sign")
    @PreAuthorize("hasAnyRole('CLIENT', 'BUILDER')")
    @Operation(summary = "Sign a contract")
    public ResponseEntity<ContractResponse> signContract(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            HttpServletRequest request) {
        String ipAddress = extractClientIp(request);
        ContractResponse response = contractService.signContract(user, projectId, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/versions")
    @PreAuthorize("hasAnyRole('CLIENT', 'BUILDER')")
    @Operation(summary = "Create a contract version snapshot")
    public ResponseEntity<ContractVersionResponse> createVersion(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body) {
        String changeSummary = body.getOrDefault("changeSummary", "Version snapshot");
        return ResponseEntity.ok(contractService.createVersion(user, projectId, changeSummary));
    }

    @GetMapping("/versions")
    @PreAuthorize("hasAnyRole('CLIENT', 'BUILDER', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get contract version history (parties and admins only)")
    public ResponseEntity<List<ContractVersionResponse>> getVersionHistory(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        return ResponseEntity.ok(contractService.getVersionHistory(user, projectId));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
