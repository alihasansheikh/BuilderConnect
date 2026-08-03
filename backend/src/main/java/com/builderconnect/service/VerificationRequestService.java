package com.builderconnect.service;

import com.builderconnect.dto.request.VerificationRequest;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.VerificationStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Builder/supplier verification request flow: credential validation, submission
 * (with optional supporting documents) and document upload. Admin approve/reject
 * counterparts live in AdminService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationRequestService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** Where storeVerificationDocument places uploads — the only URLs a request may reference. */
    private static final String DOCUMENT_URL_PREFIX = "/uploads/verification/";

    private final BuilderProfileRepository builderProfileRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public Map<String, Object> submitBuilderRequest(User user, VerificationRequest request) {
        BuilderProfile profile = builderProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        if (isBlank(profile.getNtnNumber()) && isBlank(profile.getPecNumber())) {
            throw new BadRequestException(
                "Add your NTN number or PEC number to your profile before requesting verification");
        }
        requireSubmittable(profile.getIsVerified(), profile.getVerificationStatus());

        profile.setVerificationStatus(VerificationStatus.PENDING);
        profile.setVerificationRequestedAt(LocalDateTime.now());
        profile.setVerificationRejectionReason(null);
        if (hasDocuments(request)) {
            validateDocumentUrls(request.getDocumentUrls());
            profile.setVerificationDocuments(toJsonArray(request.getDocumentUrls()));
        }
        BuilderProfile saved = builderProfileRepository.save(profile);

        auditService.logAction(user, "VERIFICATION_REQUESTED", "BUILDER_PROFILE", saved.getId(),
                "Builder requested verification" + noteSuffix(request));
        notificationService.notifyAdmins(NotificationType.VERIFICATION_REQUESTED,
                "New builder verification request",
                user.getName() + " has requested builder verification",
                "USER", user.getId(), "/admin/verifications");

        log.info("Builder {} submitted a verification request", user.getEmail());

        return statusPayload(saved.getVerificationStatus(), saved.getVerificationRequestedAt());
    }

    @Transactional
    public Map<String, Object> submitSupplierRequest(User user, VerificationRequest request) {
        SupplierProfile profile = supplierProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier profile not found"));

        if (isBlank(profile.getBusinessRegistrationNumber())) {
            throw new BadRequestException(
                "Add your business registration number to your profile before requesting verification");
        }
        requireSubmittable(profile.getIsVerified(), profile.getVerificationStatus());

        profile.setVerificationStatus(VerificationStatus.PENDING);
        profile.setVerificationRequestedAt(LocalDateTime.now());
        profile.setVerificationRejectionReason(null);
        if (hasDocuments(request)) {
            validateDocumentUrls(request.getDocumentUrls());
            profile.setVerificationDocuments(toJsonArray(request.getDocumentUrls()));
        }
        SupplierProfile saved = supplierProfileRepository.save(profile);

        auditService.logAction(user, "VERIFICATION_REQUESTED", "SUPPLIER_PROFILE", saved.getId(),
                "Supplier requested verification" + noteSuffix(request));
        notificationService.notifyAdmins(NotificationType.VERIFICATION_REQUESTED,
                "New supplier verification request",
                user.getName() + " has requested supplier verification",
                "USER", user.getId(), "/admin/verifications");

        log.info("Supplier {} submitted a verification request", user.getEmail());

        return statusPayload(saved.getVerificationStatus(), saved.getVerificationRequestedAt());
    }

    public String uploadDocument(User user, MultipartFile file) {
        return fileStorageService.storeVerificationDocument(file, user.getId());
    }

    private static void requireSubmittable(Boolean isVerified, VerificationStatus status) {
        if (Boolean.TRUE.equals(isVerified) || status == VerificationStatus.VERIFIED) {
            throw new BadRequestException("Your account is already verified");
        }
        if (status == VerificationStatus.PENDING) {
            throw new BadRequestException("A verification request is already pending review");
        }
    }

    private static boolean hasDocuments(VerificationRequest request) {
        return request != null && request.getDocumentUrls() != null && !request.getDocumentUrls().isEmpty();
    }

    /**
     * The admin queue renders these as clickable hrefs, so arbitrary client-supplied strings
     * (https://evil.pk, javascript: URLs) must be rejected — only files uploaded through the
     * verification document endpoint may be referenced.
     */
    private static void validateDocumentUrls(List<String> urls) {
        for (String url : urls) {
            if (url == null || !url.startsWith(DOCUMENT_URL_PREFIX) || url.contains("..")) {
                throw new BadRequestException(
                    "Document URLs must reference files uploaded via the verification document upload");
            }
        }
    }

    private static String noteSuffix(VerificationRequest request) {
        return (request != null && request.getNote() != null && !request.getNote().isBlank())
                ? " - Note: " + request.getNote()
                : "";
    }

    private static Map<String, Object> statusPayload(VerificationStatus status, LocalDateTime requestedAt) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("verificationStatus", status);
        payload.put("verificationRequestedAt", requestedAt);
        return payload;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Serializes to the JSON string form these columns store (same as SupplierProfileService). */
    private static String toJsonArray(List<String> values) {
        try {
            return OBJECT_MAPPER.writeValueAsString(values);
        } catch (Exception e) {
            throw new BadRequestException("Failed to serialize document list");
        }
    }
}
