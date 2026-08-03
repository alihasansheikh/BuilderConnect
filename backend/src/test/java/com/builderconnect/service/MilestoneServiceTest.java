package com.builderconnect.service;

import com.builderconnect.dto.response.MilestoneResponse;
import com.builderconnect.entity.Milestone;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.MilestoneStatus;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
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
class MilestoneServiceTest {

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private MilestoneService milestoneService;

    private User clientUser;
    private User builderUser;
    private Project project;
    private Milestone milestone;
    private Milestone nextMilestone;

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
                .projectNumber("PRJ-2026-00050")
                .title("Test Project")
                .description("Description")
                .client(clientUser)
                .awardedBuilder(builderUser)
                .status(ProjectStatus.IN_PROGRESS)
                .city("Karachi")
                .finalBudget(new BigDecimal("100000"))
                .build();
        project.setId(10L);

        milestone = Milestone.builder()
                .project(project)
                .title("Foundation")
                .sequenceOrder(1)
                .paymentAmount(new BigDecimal("50000"))
                .status(MilestoneStatus.IN_PROGRESS)
                .build();
        milestone.setId(100L);

        nextMilestone = Milestone.builder()
                .project(project)
                .title("Framing")
                .sequenceOrder(2)
                .paymentAmount(new BigDecimal("50000"))
                .status(MilestoneStatus.PENDING)
                .build();
        nextMilestone.setId(101L);
    }

    private MockMultipartFile proofFile() {
        return new MockMultipartFile("proof", "proof.jpg", "image/jpeg", new byte[]{1, 2, 3});
    }

    @Test
    @DisplayName("Pay is rejected while the builder has not marked the milestone complete")
    void markMilestonePaid_NotCompleted_ShouldThrow() {
        milestone.setStatus(MilestoneStatus.IN_PROGRESS);
        when(milestoneRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(milestone));
        when(projectRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> milestoneService.markMilestonePaid(clientUser, 100L, proofFile(), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Builder has not marked this milestone complete yet");
        verify(milestoneRepository, never()).save(any());
    }

    @Test
    @DisplayName("Pay is rejected until the client approves the completed work")
    void markMilestonePaid_CompletedButNotApproved_ShouldThrow() {
        milestone.setStatus(MilestoneStatus.COMPLETED);
        when(milestoneRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(milestone));
        when(projectRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> milestoneService.markMilestonePaid(clientUser, 100L, proofFile(), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Approve the completed work before paying");
        verify(milestoneRepository, never()).save(any());
    }

    @Test
    @DisplayName("Pay succeeds on an approved milestone and marks it PAID")
    void markMilestonePaid_Approved_ShouldSucceed() {
        milestone.setStatus(MilestoneStatus.APPROVED);
        when(milestoneRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(milestone));
        when(projectRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(project));
        when(fileStorageService.storePaymentProof(any(), eq(100L))).thenReturn("/uploads/payments/p.jpg");
        when(milestoneRepository.findByProjectIdOrderBySequenceOrderAsc(10L))
                .thenReturn(List.of(milestone, nextMilestone));

        MilestoneResponse response = milestoneService.markMilestonePaid(clientUser, 100L, proofFile(), "bank ref 1");

        assertThat(response.getStatus()).isEqualTo(MilestoneStatus.PAID);
        assertThat(milestone.getPaymentProofUrl()).isEqualTo("/uploads/payments/p.jpg");
        // A pending milestone remains, so the project is not completed
        assertThat(project.getStatus()).isEqualTo(ProjectStatus.IN_PROGRESS);
        verify(notificationService).createNotification(eq(builderUser), eq(NotificationType.PAYMENT_RECEIVED),
                anyString(), anyString(), eq("milestone"), eq(100L), anyString());
    }

    @Test
    @DisplayName("Confirming payment starts the next pending milestone and notifies the builder")
    void confirmMilestonePayment_ShouldStartNextMilestone() {
        milestone.setStatus(MilestoneStatus.PAID);
        when(milestoneRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(milestone));
        when(milestoneRepository.findByProjectIdOrderBySequenceOrderAsc(10L))
                .thenReturn(List.of(milestone, nextMilestone));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        MilestoneResponse response = milestoneService.confirmMilestonePayment(builderUser, 100L);

        assertThat(response.getStatus()).isEqualTo(MilestoneStatus.CONFIRMED);
        assertThat(nextMilestone.getStatus()).isEqualTo(MilestoneStatus.IN_PROGRESS);
        assertThat(project.getCurrentMilestoneId()).isEqualTo(101L);
        verify(milestoneRepository).save(nextMilestone);
        verify(notificationService).createNotification(eq(builderUser), eq(NotificationType.SYSTEM_ANNOUNCEMENT),
                eq("Next Milestone Started"), anyString(), eq("milestone"), eq(101L), anyString());
    }

    @Test
    @DisplayName("Rejecting a milestone notifies and emails the builder with the reason")
    void rejectMilestone_ShouldNotifyBuilder() {
        milestone.setStatus(MilestoneStatus.COMPLETED);
        when(milestoneRepository.findById(100L)).thenReturn(Optional.of(milestone));
        when(milestoneRepository.save(any(Milestone.class))).thenAnswer(inv -> inv.getArgument(0));

        MilestoneResponse response = milestoneService.rejectMilestone(clientUser, 100L, "Tiles are cracked");

        assertThat(response.getStatus()).isEqualTo(MilestoneStatus.REJECTED);
        verify(notificationService).createNotification(eq(builderUser), eq(NotificationType.SYSTEM_ANNOUNCEMENT),
                eq("Milestone Changes Requested"), anyString(), eq("milestone"), eq(100L), anyString());
        verify(emailService).sendMilestoneRejectedEmail(builderUser, "Foundation", "Test Project", "Tiles are cracked");
    }
}
