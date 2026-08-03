package com.builderconnect.service;

import com.builderconnect.dto.request.BidCreateRequest;
import com.builderconnect.dto.response.BidResponse;
import com.builderconnect.entity.Bid;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.SubscriptionPlan;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.ProjectRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BidServiceTest {

    @Mock
    private BidRepository bidRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditService auditService;

    @Mock
    private LeadService leadService;

    @Mock
    private SubscriptionService subscriptionService;

    @Mock
    private SystemSettingService systemSettingService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private BidService bidService;

    private User builderUser;
    private User clientUser;
    private Project project;
    private BidCreateRequest request;

    @BeforeEach
    void setUp() {
        clientUser = User.builder()
                .email("client@test.com")
                .name("Test Client")
                .role(UserRole.CLIENT)
                .suspended(false)
                .build();
        clientUser.setId(1L);

        builderUser = User.builder()
                .email("builder@test.com")
                .name("Test Builder")
                .role(UserRole.BUILDER)
                .suspended(false)
                .build();
        builderUser.setId(2L);

        project = Project.builder()
                .projectNumber("PRJ-2026-00099")
                .title("Test Project")
                .client(clientUser)
                .status(ProjectStatus.OPEN)
                .build();
        project.setId(10L);

        request = BidCreateRequest.builder()
                .projectId(10L)
                .amount(new BigDecimal("500000"))
                .proposal("A detailed proposal describing the planned work, materials and timeline for this project.")
                .estimatedDurationDays(30)
                .build();
    }

    private void stubBidLimits(String min, String max) {
        when(systemSettingService.getDecimal(eq(SystemSettingService.KEY_MIN_BID_AMOUNT), any()))
                .thenReturn(new BigDecimal(min));
        when(systemSettingService.getDecimal(eq(SystemSettingService.KEY_MAX_BID_AMOUNT), any()))
                .thenReturn(new BigDecimal(max));
    }

    private void stubSuccessfulCreatePath() {
        when(projectRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(project));
        when(bidRepository.existsByProjectIdAndBuilderIdAndStatusNot(eq(10L), eq(2L), any()))
                .thenReturn(false);
        stubBidLimits("1000", "50000000");
        when(builderProfileRepository.findByUserId(2L))
                .thenReturn(Optional.of(BuilderProfile.builder().user(builderUser).build()));
        when(subscriptionService.getEffectivePlan(any(BuilderProfile.class)))
                .thenReturn(SubscriptionPlan.builder().build());
        when(bidRepository.countByBuilderIdAndStatusIn(eq(2L), any())).thenReturn(0L);
        when(bidRepository.findByProjectIdAndBuilderId(10L, 2L)).thenReturn(Optional.empty());
        when(bidRepository.getNextBidNumber(anyString())).thenReturn(1L);
        when(bidRepository.save(any(Bid.class))).thenAnswer(inv -> {
            Bid bid = inv.getArgument(0);
            bid.setId(5L);
            return bid;
        });
    }

    @Test
    @DisplayName("createBid rejects an amount above the configured max_bid_amount")
    void createBid_AmountAboveMax_ShouldThrow() {
        when(projectRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(project));
        when(bidRepository.existsByProjectIdAndBuilderIdAndStatusNot(eq(10L), eq(2L), any()))
                .thenReturn(false);
        stubBidLimits("1000", "50000000");
        request.setAmount(new BigDecimal("60000000"));

        assertThatThrownBy(() -> bidService.createBid(builderUser, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bid amount must be between");
        verify(bidRepository, never()).save(any());
    }

    @Test
    @DisplayName("createBid rejects an amount below the configured min_bid_amount")
    void createBid_AmountBelowMin_ShouldThrow() {
        when(projectRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(project));
        when(bidRepository.existsByProjectIdAndBuilderIdAndStatusNot(eq(10L), eq(2L), any()))
                .thenReturn(false);
        stubBidLimits("100000", "50000000");
        request.setAmount(new BigDecimal("50000"));

        assertThatThrownBy(() -> bidService.createBid(builderUser, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bid amount must be between");
        verify(bidRepository, never()).save(any());
    }

    @Test
    @DisplayName("createBid defaults validUntil to now + bid_validity_days when omitted")
    void createBid_WithoutValidUntil_ShouldDefaultFromSettings() {
        stubSuccessfulCreatePath();
        when(systemSettingService.getInt(eq(SystemSettingService.KEY_BID_VALIDITY_DAYS), anyInt()))
                .thenReturn(45);

        BidResponse response = bidService.createBid(builderUser, request);

        assertThat(response.getValidUntil()).isEqualTo(LocalDate.now().plusDays(45));
        verify(auditService).logAction(eq(builderUser), eq("BID_CREATED"), eq("BID"), anyLong(), anyString());
    }

    @Test
    @DisplayName("createBid keeps an explicitly provided validUntil")
    void createBid_WithExplicitValidUntil_ShouldKeepIt() {
        stubSuccessfulCreatePath();
        LocalDate explicit = LocalDate.now().plusDays(10);
        request.setValidUntil(explicit);

        BidResponse response = bidService.createBid(builderUser, request);

        assertThat(response.getValidUntil()).isEqualTo(explicit);
        verify(systemSettingService, never()).getInt(eq(SystemSettingService.KEY_BID_VALIDITY_DAYS), anyInt());
    }
}
