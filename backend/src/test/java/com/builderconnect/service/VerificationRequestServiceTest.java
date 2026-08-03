package com.builderconnect.service;

import com.builderconnect.dto.request.VerificationRequest;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.enums.VerificationStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerificationRequestServiceTest {

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private SupplierProfileRepository supplierProfileRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private VerificationRequestService verificationRequestService;

    private User builderUser;
    private User supplierUser;
    private BuilderProfile builderProfile;
    private SupplierProfile supplierProfile;

    @BeforeEach
    void setUp() {
        builderUser = User.builder()
                .email("builder@example.com")
                .name("Test Builder")
                .role(UserRole.BUILDER)
                .build();
        builderUser.setId(1L);

        builderProfile = BuilderProfile.builder()
                .user(builderUser)
                .ntnNumber("NTN-12345")
                .isVerified(false)
                .verificationStatus(VerificationStatus.UNSUBMITTED)
                .build();
        builderProfile.setId(10L);

        supplierUser = User.builder()
                .email("supplier@example.com")
                .name("Test Supplier")
                .role(UserRole.SUPPLIER)
                .build();
        supplierUser.setId(2L);

        supplierProfile = SupplierProfile.builder()
                .user(supplierUser)
                .companyName("Test Supplies")
                .businessRegistrationNumber("BRN-99")
                .isVerified(false)
                .verificationStatus(VerificationStatus.UNSUBMITTED)
                .build();
        supplierProfile.setId(20L);
    }

    @Test
    @DisplayName("Builder request without NTN or PEC number is rejected with 400")
    void submitBuilderRequest_missingCredentials_throwsBadRequest() {
        builderProfile.setNtnNumber("  ");
        builderProfile.setPecNumber(null);
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));

        assertThatThrownBy(() -> verificationRequestService.submitBuilderRequest(builderUser, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("NTN");

        verify(builderProfileRepository, never()).save(any());
        verify(notificationService, never()).notifyAdmins(any(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Builder request while one is already pending is rejected with 400")
    void submitBuilderRequest_alreadyPending_throwsBadRequest() {
        builderProfile.setVerificationStatus(VerificationStatus.PENDING);
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));

        assertThatThrownBy(() -> verificationRequestService.submitBuilderRequest(builderUser, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already pending");

        verify(builderProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("Builder request when already verified is rejected with 400")
    void submitBuilderRequest_alreadyVerified_throwsBadRequest() {
        builderProfile.setIsVerified(true);
        builderProfile.setVerificationStatus(VerificationStatus.VERIFIED);
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));

        assertThatThrownBy(() -> verificationRequestService.submitBuilderRequest(builderUser, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already verified");
    }

    @Test
    @DisplayName("Valid builder request goes PENDING, stores documents and notifies admins")
    void submitBuilderRequest_valid_setsPendingAndNotifies() {
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));
        when(builderProfileRepository.save(any(BuilderProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        VerificationRequest request = VerificationRequest.builder()
                .note("Please verify me")
                .documentUrls(List.of("/uploads/verification/verification_1_a.pdf"))
                .build();

        var result = verificationRequestService.submitBuilderRequest(builderUser, request);

        assertThat(builderProfile.getVerificationStatus()).isEqualTo(VerificationStatus.PENDING);
        assertThat(builderProfile.getVerificationRequestedAt()).isNotNull();
        assertThat(builderProfile.getVerificationDocuments())
                .contains("/uploads/verification/verification_1_a.pdf");
        assertThat(result.get("verificationStatus")).isEqualTo(VerificationStatus.PENDING);
        verify(notificationService).notifyAdmins(eq(NotificationType.VERIFICATION_REQUESTED),
                eq("New builder verification request"), anyString(),
                eq("USER"), eq(1L), eq("/admin/verifications"));
        verify(auditService).logAction(eq(builderUser), eq("VERIFICATION_REQUESTED"),
                eq("BUILDER_PROFILE"), eq(10L), anyString());
    }

    @Test
    @DisplayName("Document URLs outside /uploads/verification/ are rejected with 400")
    void submitBuilderRequest_foreignDocumentUrl_throwsBadRequest() {
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));

        VerificationRequest request = VerificationRequest.builder()
                .documentUrls(List.of("javascript:fetch('/api/v1/admin/users')"))
                .build();

        assertThatThrownBy(() -> verificationRequestService.submitBuilderRequest(builderUser, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("verification document upload");

        verify(builderProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("Document URLs with path traversal are rejected with 400")
    void submitBuilderRequest_traversalDocumentUrl_throwsBadRequest() {
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));

        VerificationRequest request = VerificationRequest.builder()
                .documentUrls(List.of("/uploads/verification/../../secrets.txt"))
                .build();

        assertThatThrownBy(() -> verificationRequestService.submitBuilderRequest(builderUser, request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Supplier document URLs are validated the same way")
    void submitSupplierRequest_foreignDocumentUrl_throwsBadRequest() {
        when(supplierProfileRepository.findByUserId(2L)).thenReturn(Optional.of(supplierProfile));

        VerificationRequest request = VerificationRequest.builder()
                .documentUrls(List.of("https://evil.pk/malware.pdf"))
                .build();

        assertThatThrownBy(() -> verificationRequestService.submitSupplierRequest(supplierUser, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("verification document upload");

        verify(supplierProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("A REJECTED builder may resubmit immediately; rejection reason is cleared")
    void submitBuilderRequest_afterRejection_allowsResubmission() {
        builderProfile.setVerificationStatus(VerificationStatus.REJECTED);
        builderProfile.setVerificationRejectionReason("Missing documents");
        when(builderProfileRepository.findByUserId(1L)).thenReturn(Optional.of(builderProfile));
        when(builderProfileRepository.save(any(BuilderProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        verificationRequestService.submitBuilderRequest(builderUser, null);

        assertThat(builderProfile.getVerificationStatus()).isEqualTo(VerificationStatus.PENDING);
        assertThat(builderProfile.getVerificationRejectionReason()).isNull();
    }

    @Test
    @DisplayName("Supplier request without business registration number is rejected with 400")
    void submitSupplierRequest_missingRegistrationNumber_throwsBadRequest() {
        supplierProfile.setBusinessRegistrationNumber(null);
        when(supplierProfileRepository.findByUserId(2L)).thenReturn(Optional.of(supplierProfile));

        assertThatThrownBy(() -> verificationRequestService.submitSupplierRequest(supplierUser, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("business registration number");

        verify(supplierProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("Supplier request while one is already pending is rejected with 400")
    void submitSupplierRequest_alreadyPending_throwsBadRequest() {
        supplierProfile.setVerificationStatus(VerificationStatus.PENDING);
        when(supplierProfileRepository.findByUserId(2L)).thenReturn(Optional.of(supplierProfile));

        assertThatThrownBy(() -> verificationRequestService.submitSupplierRequest(supplierUser, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already pending");
    }

    @Test
    @DisplayName("Valid supplier request goes PENDING and notifies admins")
    void submitSupplierRequest_valid_setsPendingAndNotifies() {
        when(supplierProfileRepository.findByUserId(2L)).thenReturn(Optional.of(supplierProfile));
        when(supplierProfileRepository.save(any(SupplierProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = verificationRequestService.submitSupplierRequest(supplierUser, null);

        assertThat(supplierProfile.getVerificationStatus()).isEqualTo(VerificationStatus.PENDING);
        assertThat(supplierProfile.getVerificationRequestedAt()).isNotNull();
        assertThat(result.get("verificationStatus")).isEqualTo(VerificationStatus.PENDING);
        verify(notificationService).notifyAdmins(eq(NotificationType.VERIFICATION_REQUESTED),
                eq("New supplier verification request"), anyString(),
                eq("USER"), eq(2L), eq("/admin/verifications"));
    }
}
