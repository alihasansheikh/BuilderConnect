package com.builderconnect.controller;

import com.builderconnect.dto.request.CertificationRequest;
import com.builderconnect.dto.response.CertificationResponse;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.CertificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Profile certifications: authenticated reads by user id, owner-scoped writes for builders
 * and suppliers. Writes are dual-mapped: the legacy /v1/builder/me/... path (URL-gated to
 * BUILDER) and the role-neutral /v1/users/me/... path suppliers can reach.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Certifications", description = "Profile certification endpoints")
public class CertificationController {

    private final CertificationService certificationService;

    @GetMapping("/v1/users/{userId}/certifications")
    @Operation(summary = "Get a user's certifications")
    public ResponseEntity<List<CertificationResponse>> getUserCertifications(@PathVariable Long userId) {
        return ResponseEntity.ok(certificationService.getUserCertifications(userId));
    }

    @PostMapping({"/v1/builder/me/certifications", "/v1/users/me/certifications"})
    @PreAuthorize("hasAnyRole('BUILDER','SUPPLIER')")
    @Operation(summary = "Add a certification to my profile")
    public ResponseEntity<CertificationResponse> createCertification(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CertificationRequest request) {
        return ResponseEntity.ok(certificationService.create(user, request));
    }

    @PutMapping({"/v1/builder/me/certifications/{id}", "/v1/users/me/certifications/{id}"})
    @PreAuthorize("hasAnyRole('BUILDER','SUPPLIER')")
    @Operation(summary = "Update one of my certifications")
    public ResponseEntity<CertificationResponse> updateCertification(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody CertificationRequest request) {
        return ResponseEntity.ok(certificationService.update(user, id, request));
    }

    @DeleteMapping({"/v1/builder/me/certifications/{id}", "/v1/users/me/certifications/{id}"})
    @PreAuthorize("hasAnyRole('BUILDER','SUPPLIER')")
    @Operation(summary = "Delete one of my certifications")
    public ResponseEntity<Map<String, String>> deleteCertification(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        certificationService.delete(user, id);
        return ResponseEntity.ok(Map.of("message", "Certification deleted"));
    }

    @PostMapping({"/v1/builder/me/certifications/document", "/v1/users/me/certifications/document"})
    @PreAuthorize("hasAnyRole('BUILDER','SUPPLIER')")
    @Operation(summary = "Upload a certificate document (image/pdf)")
    public ResponseEntity<Map<String, String>> uploadCertificationDocument(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        String url = certificationService.uploadDocument(user, file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
