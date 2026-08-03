package com.builderconnect.service;

import com.builderconnect.dto.response.UserResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTeamTest {

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

    private User superAdmin;

    @BeforeEach
    void setUp() {
        superAdmin = User.builder()
                .email("superadmin@example.com")
                .name("Super Admin")
                .role(UserRole.SUPER_ADMIN)
                .build();
        superAdmin.setId(1L);
    }

    @Test
    @DisplayName("Creating a SUPPORT_AGENT account works and audits SUPPORT_AGENT_CREATED")
    void createAdminUser_supportAgentRole_createsAccount() {
        when(userRepository.existsByEmailAndDeletedFalse("agent@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            saved.setId(42L);
            return saved;
        });

        UserResponse response = adminService.createAdminUser(superAdmin, "Agent One",
                "agent@example.com", null, "password123", UserRole.SUPPORT_AGENT);

        assertThat(response.getRole()).isEqualTo(UserRole.SUPPORT_AGENT);
        assertThat(response.getEmailVerified()).isTrue();
        verify(auditService).logAction(eq(superAdmin), eq("SUPPORT_AGENT_CREATED"),
                eq("USER"), eq(42L), anyString());
    }

    @Test
    @DisplayName("Creating an ADMIN account still audits ADMIN_CREATED")
    void createAdminUser_adminRole_createsAccount() {
        when(userRepository.existsByEmailAndDeletedFalse("newadmin@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            saved.setId(43L);
            return saved;
        });

        UserResponse response = adminService.createAdminUser(superAdmin, "New Admin",
                "newadmin@example.com", null, "password123", UserRole.ADMIN);

        assertThat(response.getRole()).isEqualTo(UserRole.ADMIN);
        verify(auditService).logAction(eq(superAdmin), eq("ADMIN_CREATED"),
                eq("USER"), eq(43L), anyString());
    }

    @Test
    @DisplayName("Creating with CLIENT role fails with 400")
    void createAdminUser_clientRole_throwsBadRequest() {
        assertThatThrownBy(() -> adminService.createAdminUser(superAdmin, "Client Guy",
                "client@example.com", null, "password123", UserRole.CLIENT))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ADMIN or SUPPORT_AGENT");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Creating with null role fails with 400")
    void createAdminUser_nullRole_throwsBadRequest() {
        assertThatThrownBy(() -> adminService.createAdminUser(superAdmin, "No Role",
                "norole@example.com", null, "password123", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ADMIN or SUPPORT_AGENT");

        verify(userRepository, never()).save(any());
    }
}
