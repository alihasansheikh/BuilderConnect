package com.builderconnect.controller;

import com.builderconnect.dto.request.SupplierProfileUpdateRequest;
import com.builderconnect.dto.request.VerificationRequest;
import com.builderconnect.dto.response.MaterialOrderResponse;
import com.builderconnect.dto.response.SupplierProfileResponse;
import com.builderconnect.dto.response.SupplierRevenueResponse;
import com.builderconnect.dto.response.SupplierStatsResponse;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.SupplierProfileService;
import com.builderconnect.service.VerificationRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Controller for supplier profile self-management.
 */
@RestController
@RequestMapping("/v1/supplier/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPPLIER')")
@Tag(name = "Supplier Profile", description = "Supplier self-service profile endpoints")
public class SupplierProfileController {

    private final SupplierProfileService supplierProfileService;
    private final VerificationRequestService verificationRequestService;

    @GetMapping("/profile")
    @Operation(summary = "Get my supplier profile")
    public ResponseEntity<SupplierProfileResponse> getMyProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supplierProfileService.getMyProfile(user));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update my supplier profile")
    public ResponseEntity<SupplierProfileResponse> updateMyProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SupplierProfileUpdateRequest request) {
        return ResponseEntity.ok(supplierProfileService.updateMyProfile(user, request));
    }

    @PostMapping("/verification-request")
    @Operation(summary = "Request account verification (requires business registration number on profile)")
    public ResponseEntity<Map<String, Object>> requestVerification(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) VerificationRequest request) {
        return ResponseEntity.ok(verificationRequestService.submitSupplierRequest(user, request));
    }

    @PostMapping("/verification-request/document")
    @Operation(summary = "Upload a verification document (image/pdf)")
    public ResponseEntity<Map<String, String>> uploadVerificationDocument(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        return ResponseEntity.ok(Map.of("url", verificationRequestService.uploadDocument(user, file)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get my supplier dashboard statistics")
    public ResponseEntity<SupplierStatsResponse> getMyStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supplierProfileService.getMyStats(user));
    }

    @GetMapping("/revenue")
    @Operation(summary = "Get my revenue summary (collected COD revenue + monthly buckets)")
    public ResponseEntity<SupplierRevenueResponse> getMyRevenue(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supplierProfileService.getMyRevenue(user));
    }

    @GetMapping("/revenue/orders")
    @Operation(summary = "Get my paid orders, newest payment first")
    public ResponseEntity<Page<MaterialOrderResponse>> getMyRevenueOrders(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(supplierProfileService.getMyRevenueOrders(user, pageable));
    }
}
