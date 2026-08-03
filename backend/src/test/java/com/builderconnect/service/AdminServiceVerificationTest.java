package com.builderconnect.service;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.enums.VerificationStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.AuditLogRepository;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SubscriptionPaymentRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

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
class AdminServiceVerificationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private SupplierProfileRepository supplierProfileRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private BidRepository bidRepository;

    @Mock
    private SubscriptionPaymentRepository subscriptionPaymentRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ReviewService reviewService;

    @Mock
    private BadgeService badgeService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AdminService adminService;

    private User admin;
    private User builderUser;
    private BuilderProfile builderProfile;
    private User supplierUser;
    private SupplierProfile supplierProfile;

    @BeforeEach
    void setUp() {
        admin = User.builder()
                .email("admin@example.com")
                .name("Admin")
                .role(UserRole.ADMIN)
                .build();
        admin.setId(99L);

        builderUser = User.builder()
                .email("builder@example.com")
                .name("Test Builder")
                .role(UserRole.BUILDER)
                .build();
        builderUser.setId(1L);

        builderProfile = BuilderProfile.builder()
                .user(builderUser)
                .isVerified(false)
                .verificationStatus(VerificationStatus.PENDING)
                .build();
        builderProfile.setId(10L);
        builderUser.setBuilderProfile(builderProfile);

        supplierUser = User.builder()
                .email("supplier@example.com")
                .name("Test Supplier")
                .role(UserRole.SUPPLIER)
                .build();
        supplierUser.setId(2L);

        supplierProfile = SupplierProfile.builder()
                .user(supplierUser)
                .companyName("Test Supplies")
                .isVerified(false)
                .verificationStatus(VerificationStatus.PENDING)
                .build();
        supplierProfile.setId(20L);
        supplierUser.setSupplierProfile(supplierProfile);
    }

    @Test
    @DisplayName("Rejecting a builder verification without a reason fails with 400")
    void rejectBuilderVerification_missingReason_throwsBadRequest() {
        assertThatThrownBy(() -> adminService.rejectBuilderVerification(admin, 1L, "  "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("reason is required");

        verify(builderProfileRepository, never()).save(any());
        verify(notificationService, never()).createNotification(any(), any(), anyString(), anyString(),
                anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Rejecting a builder with no pending request fails with 400")
    void rejectBuilderVerification_noPendingRequest_throwsBadRequest() {
        builderProfile.setVerificationStatus(VerificationStatus.UNSUBMITTED);
        when(userRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(builderUser));

        assertThatThrownBy(() -> adminService.rejectBuilderVerification(admin, 1L, "Documents unreadable"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("No pending verification request");

        verify(builderProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejecting a builder sets REJECTED with the reason and notifies the builder")
    void rejectBuilderVerification_pending_rejectsAndNotifies() {
        when(userRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(builderUser));

        adminService.rejectBuilderVerification(admin, 1L, "NTN number could not be validated");

        assertThat(builderProfile.getVerificationStatus()).isEqualTo(VerificationStatus.REJECTED);
        assertThat(builderProfile.getVerificationRejectionReason())
                .isEqualTo("NTN number could not be validated");
        verify(builderProfileRepository).save(builderProfile);
        verify(notificationService).createNotification(eq(builderUser),
                eq(NotificationType.VERIFICATION_REJECTED), eq("Verification Request Rejected"),
                anyString(), eq("USER"), eq(1L), eq("/profile"));
        verify(auditService).logAction(eq(admin), eq("BUILDER_VERIFICATION_REJECTED"),
                eq("USER"), eq(1L), anyString());
    }

    @Test
    @DisplayName("Rejecting a supplier verification without a reason fails with 400")
    void rejectSupplierVerification_missingReason_throwsBadRequest() {
        assertThatThrownBy(() -> adminService.rejectSupplierVerification(admin, 2L, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("reason is required");

        verify(supplierProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejecting a supplier sets REJECTED with the reason and notifies the supplier")
    void rejectSupplierVerification_pending_rejectsAndNotifies() {
        when(userRepository.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(supplierUser));

        adminService.rejectSupplierVerification(admin, 2L, "Business registration expired");

        assertThat(supplierProfile.getVerificationStatus()).isEqualTo(VerificationStatus.REJECTED);
        assertThat(supplierProfile.getVerificationRejectionReason())
                .isEqualTo("Business registration expired");
        verify(supplierProfileRepository).save(supplierProfile);
        verify(notificationService).createNotification(eq(supplierUser),
                eq(NotificationType.VERIFICATION_REJECTED), eq("Verification Request Rejected"),
                anyString(), eq("USER"), eq(2L), eq("/profile"));
    }

    @Test
    @DisplayName("Verifying a builder also marks the verification status VERIFIED")
    void verifyBuilder_pendingRequest_setsVerificationStatusVerified() {
        when(userRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(builderUser));

        adminService.verifyBuilder(admin, 1L);

        assertThat(builderProfile.getIsVerified()).isTrue();
        assertThat(builderProfile.getVerificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(builderProfile.getVerificationRejectionReason()).isNull();
    }
}
