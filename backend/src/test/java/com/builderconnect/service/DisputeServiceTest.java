package com.builderconnect.service;

import com.builderconnect.dto.request.DisputeCommentRequest;
import com.builderconnect.dto.request.DisputeCreateRequest;
import com.builderconnect.dto.response.DisputeResponse;
import com.builderconnect.entity.Dispute;
import com.builderconnect.entity.Dispute.DisputeStatus;
import com.builderconnect.entity.Dispute.DisputeType;
import com.builderconnect.entity.DisputeComment;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.DisputeCommentRepository;
import com.builderconnect.repository.DisputeRepository;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.matches;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DisputeServiceTest {

    private static final long PROJECT_ID = 1L;
    private static final long DISPUTE_ID = 7L;

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private DisputeCommentRepository disputeCommentRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private DisputeService disputeService;

    private User client;
    private User builder;
    private User agent;
    private Project project;

    @BeforeEach
    void setUp() {
        client = user(10L, "client1@example.com", UserRole.CLIENT);
        builder = user(11L, "builder1@example.com", UserRole.BUILDER);
        agent = user(1L, "support@builderconnect.pk", UserRole.SUPPORT_AGENT);
        project = Project.builder()
                .projectNumber("PRJ-2026-00001")
                .client(client)
                .awardedBuilder(builder)
                .title("Kitchen Renovation")
                .status(ProjectStatus.IN_PROGRESS)
                .build();
        project.setId(PROJECT_ID);
    }

    @Test
    @DisplayName("fileDispute by a user who is neither client nor awarded builder is rejected")
    void fileDispute_stranger_rejected() {
        User stranger = user(12L, "client2@example.com", UserRole.CLIENT);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> disputeService.fileDispute(stranger, PROJECT_ID, disputeRequest()))
                .isInstanceOf(UnauthorizedException.class);

        verify(disputeRepository, never()).save(any());
    }

    @Test
    @DisplayName("fileDispute on a pre-award project is rejected")
    void fileDispute_openProject_rejected() {
        project.setStatus(ProjectStatus.OPEN);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> disputeService.fileDispute(client, PROJECT_ID, disputeRequest()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("awarded");

        verify(disputeRepository, never()).save(any());
    }

    @Test
    @DisplayName("fileDispute auto-infers the respondent as the project counterpart")
    void fileDispute_respondentAutoInferred() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        stubDisputeSaveAssignsId();

        DisputeResponse response = disputeService.fileDispute(client, PROJECT_ID, disputeRequest());

        assertThat(response.getFiledById()).isEqualTo(client.getId());
        assertThat(response.getFiledAgainstId()).isEqualTo(builder.getId());
        verify(notificationService).notifySupportAgents(eq(NotificationType.DISPUTE_OPENED),
                anyString(), anyString(), eq("dispute"), eq(DISPUTE_ID), eq("/support/disputes"));
        verify(notificationService).createNotification(eq(builder), eq(NotificationType.DISPUTE_OPENED),
                anyString(), anyString(), eq("dispute"), eq(DISPUTE_ID),
                eq("/builder/support?tab=disputes"));
        verify(emailService).sendDisputeFiledEmail(eq(builder), matches("DSP-\\d{4}-00007"),
                eq("Kitchen Renovation"));
    }

    @Test
    @DisplayName("fileDispute with a filedAgainstId that is not the counterpart is rejected")
    void fileDispute_mismatchedFiledAgainst_rejected() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        DisputeCreateRequest request = disputeRequest();
        request.setFiledAgainstId(99L);

        assertThatThrownBy(() -> disputeService.fileDispute(client, PROJECT_ID, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("other party");

        verify(disputeRepository, never()).save(any());
    }

    @Test
    @DisplayName("resolveDispute without a resolutionType returns 400 listing the legal values")
    void resolveDispute_missingResolutionType_badRequest() {
        when(disputeRepository.findById(DISPUTE_ID)).thenReturn(Optional.of(dispute()));

        assertThatThrownBy(() -> disputeService.resolveDispute(agent, DISPUTE_ID, Map.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("FAVOR_FILER")
                .hasMessageContaining("DISMISSED");

        verify(disputeRepository, never()).save(any());
    }

    @Test
    @DisplayName("resolveDispute rejects a resolutionType outside the SQL enum")
    void resolveDispute_illegalResolutionType_badRequest() {
        when(disputeRepository.findById(DISPUTE_ID)).thenReturn(Optional.of(dispute()));

        assertThatThrownBy(() -> disputeService.resolveDispute(agent, DISPUTE_ID,
                Map.of("resolutionType", "MEDIATED")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("resolutionType");

        verify(disputeRepository, never()).save(any());
    }

    @Test
    @DisplayName("resolveDispute with a legal resolutionType resolves and notifies both parties")
    void resolveDispute_legalType_resolvesAndNotifiesParties() {
        Dispute dispute = dispute();
        when(disputeRepository.findById(DISPUTE_ID)).thenReturn(Optional.of(dispute));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(inv -> inv.getArgument(0));
        when(disputeCommentRepository.countByDisputeId(DISPUTE_ID)).thenReturn(2L);

        DisputeResponse response = disputeService.resolveDispute(agent, DISPUTE_ID,
                Map.of("resolutionType", "MUTUAL_AGREEMENT", "resolutionDetails", "Settled amicably"));

        assertThat(response.getStatus()).isEqualTo("RESOLVED");
        assertThat(response.getResolutionType()).isEqualTo("MUTUAL_AGREEMENT");
        verify(notificationService).createNotification(eq(client), eq(NotificationType.DISPUTE_RESOLVED),
                anyString(), anyString(), eq("dispute"), eq(DISPUTE_ID),
                eq("/client/support?tab=disputes"));
        verify(notificationService).createNotification(eq(builder), eq(NotificationType.DISPUTE_RESOLVED),
                anyString(), anyString(), eq("dispute"), eq(DISPUTE_ID),
                eq("/builder/support?tab=disputes"));
    }

    @Test
    @DisplayName("escalateDispute sets status ESCALATED and notifies admins")
    void escalateDispute_setsStatusAndNotifiesAdmins() {
        Dispute dispute = dispute();
        when(disputeRepository.findById(DISPUTE_ID)).thenReturn(Optional.of(dispute));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(inv -> inv.getArgument(0));
        when(disputeCommentRepository.countByDisputeId(DISPUTE_ID)).thenReturn(0L);

        DisputeResponse response = disputeService.escalateDispute(agent, DISPUTE_ID);

        assertThat(response.getStatus()).isEqualTo("ESCALATED");
        verify(notificationService).notifyAdmins(eq(NotificationType.DISPUTE_OPENED),
                anyString(), anyString(), eq("dispute"), eq(DISPUTE_ID), eq("/support/disputes"));
    }

    @Test
    @DisplayName("addComment by support on a FILED dispute flips it to UNDER_REVIEW")
    void addComment_supportOnFiled_flipsToUnderReview() {
        Dispute dispute = dispute();
        when(disputeRepository.findById(DISPUTE_ID)).thenReturn(Optional.of(dispute));
        when(disputeCommentRepository.save(any(DisputeComment.class))).thenAnswer(inv -> {
            DisputeComment c = inv.getArgument(0);
            c.setId(3L);
            return c;
        });

        disputeService.addComment(agent, DISPUTE_ID,
                DisputeCommentRequest.builder().comment("Looking into this").build());

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.UNDER_REVIEW);
        verify(disputeRepository).save(dispute);
    }

    private DisputeCreateRequest disputeRequest() {
        return DisputeCreateRequest.builder()
                .disputeType("QUALITY")
                .title("Poor tiling work")
                .description("Tiles are uneven across the kitchen floor")
                .build();
    }

    private Dispute dispute() {
        Dispute dispute = Dispute.builder()
                .disputeNumber("DSP-2026-00007")
                .project(project)
                .filedBy(client)
                .filedAgainst(builder)
                .disputeType(DisputeType.QUALITY)
                .title("Poor tiling work")
                .description("Tiles are uneven across the kitchen floor")
                .build();
        dispute.setId(DISPUTE_ID);
        return dispute;
    }

    private void stubDisputeSaveAssignsId() {
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(inv -> {
            Dispute d = inv.getArgument(0);
            d.setId(DISPUTE_ID);
            return d;
        });
    }

    private User user(Long id, String email, UserRole role) {
        User u = User.builder()
                .email(email)
                .name("User " + id)
                .role(role)
                .build();
        u.setId(id);
        return u;
    }
}
