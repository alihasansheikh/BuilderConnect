package com.builderconnect.service;

import com.builderconnect.dto.request.CertificationRequest;
import com.builderconnect.dto.response.CertificationResponse;
import com.builderconnect.entity.Certification;
import com.builderconnect.entity.User;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.CertificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Business logic for profile certifications: public (authenticated) reads and owner-scoped writes.
 */
@Service
@RequiredArgsConstructor
public class CertificationService {

    private final CertificationRepository certificationRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<CertificationResponse> getUserCertifications(Long userId) {
        return certificationRepository.findByUserIdOrderByIssueDateDesc(userId).stream()
                .map(CertificationResponse::fromEntity)
                .toList();
    }

    @Transactional
    public CertificationResponse create(User builder, CertificationRequest request) {
        Certification certification = Certification.builder()
                .userId(builder.getId())
                .build();
        applyRequest(certification, request);
        return CertificationResponse.fromEntity(certificationRepository.save(certification));
    }

    @Transactional
    public CertificationResponse update(User builder, Long id, CertificationRequest request) {
        Certification certification = getOwned(builder, id);
        applyRequest(certification, request);
        return CertificationResponse.fromEntity(certificationRepository.save(certification));
    }

    @Transactional
    public void delete(User builder, Long id) {
        Certification certification = getOwned(builder, id);
        certificationRepository.delete(certification);
    }

    @Transactional
    public String uploadDocument(User builder, MultipartFile file) {
        return fileStorageService.storeCertificationDocument(file, builder.getId());
    }

    private Certification getOwned(User builder, Long id) {
        return certificationRepository.findByIdAndUserId(id, builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certification not found"));
    }

    private void applyRequest(Certification certification, CertificationRequest request) {
        certification.setName(request.getName());
        certification.setIssuingOrganization(request.getIssuingOrganization());
        certification.setIssueDate(request.getIssueDate());
        certification.setExpiryDate(request.getExpiryDate());
        certification.setCredentialId(request.getCredentialId());
        certification.setCredentialUrl(request.getCredentialUrl());
        certification.setDocumentUrl(request.getDocumentUrl());
    }
}
