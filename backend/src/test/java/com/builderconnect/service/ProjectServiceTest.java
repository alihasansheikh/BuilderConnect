package com.builderconnect.service;

import com.builderconnect.dto.request.ProjectCreateRequest;
import com.builderconnect.dto.response.ProjectResponse;
import com.builderconnect.entity.Bid;
import com.builderconnect.entity.LeadTransaction;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.BidStatus;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.ContractRepository;
import com.builderconnect.repository.ProjectCategoryRepository;
import com.builderconnect.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private BidRepository bidRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditService auditService;

    @Mock
    private LeadService leadService;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private ProjectCategoryRepository projectCategoryRepository;

    @InjectMocks
    private ProjectService projectService;

    private User clientUser;
    private Project testProject;
    private ProjectCreateRequest createRequest;

    @BeforeEach
    void setUp() {
        clientUser = User.builder()
                .email("client@test.com")
                .name("Test Client")
                .role(UserRole.CLIENT)
                .active(true)
                .build();
        clientUser.setId(1L);

        testProject = Project.builder()
                .projectNumber("PRJ-2024-0001")
                .title("Test Project")
                .description("Test project description")
                .client(clientUser)
                .status(ProjectStatus.DRAFT)
                .budgetMin(new BigDecimal("50000"))
                .budgetMax(new BigDecimal("100000"))
                .city("Karachi")
                .isPublic(true)
                .build();
        testProject.setId(1L);

        createRequest = ProjectCreateRequest.builder()
                .title("New Project")
                .description("New project description")
                .categoryId(1L)
                .city("Lahore")
                .budgetMin(new BigDecimal("75000"))
                .budgetMax(new BigDecimal("150000"))
                .deadline(LocalDate.now().plusMonths(2))
                .build();
    }

    @Test
    @DisplayName("Should create project successfully")
    void createProject_WithValidData_ShouldSucceed() {
        // Given
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project p = invocation.getArgument(0);
            p.setId(1L);
            p.setProjectNumber("PRJ-2024-0001");
            return p;
        });

        // When
        ProjectResponse response = projectService.createProject(clientUser, createRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo(createRequest.getTitle());
        assertThat(response.getStatus()).isEqualTo(ProjectStatus.DRAFT);
        verify(projectRepository).save(any(Project.class));
        verify(auditService).logAction(eq(clientUser), eq("PROJECT_CREATED"), eq("PROJECT"), eq(1L), anyString());
    }

    @Test
    @DisplayName("Should get own draft project by ID successfully")
    void getProject_AsOwner_ShouldReturnProject() {
        // Given
        when(projectRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testProject));

        // When
        ProjectResponse response = projectService.getProject(clientUser, 1L);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTitle()).isEqualTo("Test Project");
    }

    @Test
    @DisplayName("Should throw exception when project not found")
    void getProject_WithInvalidId_ShouldThrowException() {
        // Given
        when(projectRepository.findByIdAndDeletedFalse(999L)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> projectService.getProject(clientUser, 999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Project not found");
    }

    @Test
    @DisplayName("Should hide a foreign DRAFT project behind a 404")
    void getProject_ForeignDraft_ShouldThrowNotFound() {
        // Given — a different authenticated user who never bid on the project
        User stranger = User.builder()
                .email("stranger@test.com")
                .role(UserRole.BUILDER)
                .build();
        stranger.setId(99L);
        clientUser.setDeleted(false);
        when(projectRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testProject));
        when(bidRepository.existsByProjectIdAndBuilderId(1L, 99L)).thenReturn(false);

        // When/Then — 404, not 403, so private drafts don't leak their existence
        assertThatThrownBy(() -> projectService.getProject(stranger, 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Project not found");
    }

    @Test
    @DisplayName("Should let any authenticated user view an OPEN public project")
    void getProject_OpenPublic_ShouldBeVisibleToAnyone() {
        // Given
        User stranger = User.builder()
                .email("stranger@test.com")
                .role(UserRole.BUILDER)
                .build();
        stranger.setId(99L);
        clientUser.setDeleted(false);
        testProject.setStatus(ProjectStatus.OPEN);
        when(projectRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testProject));

        // When
        ProjectResponse response = projectService.getProject(stranger, 1L);

        // Then
        assertThat(response.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should publish draft project successfully")
    void publishProject_WithDraftStatus_ShouldSucceed() {
        // Given
        testProject.setStatus(ProjectStatus.DRAFT);
        when(projectRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        // When
        ProjectResponse response = projectService.publishProject(clientUser, 1L);

        // Then
        assertThat(response).isNotNull();
        assertThat(testProject.getStatus()).isEqualTo(ProjectStatus.OPEN);
        verify(projectRepository).save(testProject);
    }

    @Test
    @DisplayName("Should throw exception when publishing non-draft project")
    void publishProject_WithNonDraftStatus_ShouldThrowException() {
        // Given
        testProject.setStatus(ProjectStatus.IN_PROGRESS);
        when(projectRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testProject));

        // When/Then
        assertThatThrownBy(() -> projectService.publishProject(clientUser, 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only draft projects can be published");
    }

    @Test
    @DisplayName("Should get client projects with pagination")
    void getClientProjects_ShouldReturnPagedResults() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Project> projects = List.of(testProject);
        Page<Project> projectPage = new PageImpl<>(projects, pageable, 1);
        when(projectRepository.findByClientIdAndDeletedFalse(1L, pageable)).thenReturn(projectPage);

        // When
        Page<ProjectResponse> response = projectService.getClientProjects(clientUser, null, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should get open projects for marketplace")
    void getOpenProjects_ShouldReturnFilteredResults() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        testProject.setStatus(ProjectStatus.OPEN);
        List<Project> projects = List.of(testProject);
        Page<Project> projectPage = new PageImpl<>(projects, pageable, 1);
        when(projectRepository.searchProjects(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(projectPage);

        // When
        Page<ProjectResponse> response = projectService.getOpenProjects(
                "Karachi", null, null, null, null, null, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("Should reject awarding an expired bid")
    void awardProject_WithExpiredBid_ShouldThrowException() {
        // Given
        testProject.setStatus(ProjectStatus.BIDDING);
        User builderUser = User.builder()
                .email("builder@test.com")
                .role(UserRole.BUILDER)
                .build();
        builderUser.setId(3L);

        Bid expiredBid = Bid.builder()
                .bidNumber("BID-2026-00001")
                .project(testProject)
                .builder(builderUser)
                .amount(new BigDecimal("80000"))
                .status(BidStatus.SUBMITTED)
                .validUntil(LocalDate.now().minusDays(1))
                .build();
        expiredBid.setId(5L);

        when(projectRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testProject));
        when(bidRepository.findById(5L)).thenReturn(Optional.of(expiredBid));

        // When/Then
        assertThatThrownBy(() -> projectService.awardProject(clientUser, 1L, 5L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("expired");
        assertThat(expiredBid.getStatus()).isEqualTo(BidStatus.SUBMITTED);
        verify(projectRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cancellation rejects active bids and refunds their lead credits")
    void cancelProject_WithActiveBids_ShouldRejectAndRefund() {
        // Given
        testProject.setStatus(ProjectStatus.BIDDING);
        User builderUser = User.builder()
                .email("builder@test.com")
                .role(UserRole.BUILDER)
                .build();
        builderUser.setId(3L);

        Bid activeBid = Bid.builder()
                .bidNumber("BID-2026-00002")
                .project(testProject)
                .builder(builderUser)
                .amount(new BigDecimal("90000"))
                .status(BidStatus.SUBMITTED)
                .build();
        activeBid.setId(6L);

        when(projectRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testProject));
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.SUBMITTED)).thenReturn(List.of(activeBid));
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.UNDER_REVIEW)).thenReturn(List.of());
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.SHORTLISTED)).thenReturn(List.of());
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        ProjectResponse response = projectService.cancelProject(clientUser, 1L, "Plans changed");

        // Then
        assertThat(response.getStatus()).isEqualTo(ProjectStatus.CANCELLED);
        assertThat(activeBid.getStatus()).isEqualTo(BidStatus.REJECTED);
        verify(leadService).addLeadCredits(eq(builderUser), eq(1),
                eq(LeadTransaction.TransactionType.REFUND), anyString());
        verify(auditService).logAction(eq(clientUser), eq("PROJECT_CANCELLED"), eq("PROJECT"), eq(1L), anyString());
        assertThat(testProject.getCancellationReason()).isEqualTo("Plans changed");
    }

    @Test
    @DisplayName("Cancelling an awarded project rejects the accepted bid and refunds the awarded builder")
    void cancelProject_Awarded_ShouldRejectAcceptedBidAndRefund() {
        testProject.setStatus(ProjectStatus.AWARDED);
        User builderUser = User.builder()
                .email("builder@test.com")
                .role(UserRole.BUILDER)
                .build();
        builderUser.setId(4L);
        testProject.setAwardedBuilder(builderUser);

        Bid acceptedBid = Bid.builder()
                .bidNumber("BID-2026-00003")
                .project(testProject)
                .builder(builderUser)
                .amount(new BigDecimal("95000"))
                .status(BidStatus.ACCEPTED)
                .build();
        acceptedBid.setId(9L);

        when(projectRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testProject));
        when(contractRepository.findByProjectId(1L)).thenReturn(Optional.empty());
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.SUBMITTED)).thenReturn(List.of());
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.UNDER_REVIEW)).thenReturn(List.of());
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.SHORTLISTED)).thenReturn(List.of());
        when(bidRepository.findByProjectIdAndStatus(1L, BidStatus.ACCEPTED)).thenReturn(List.of(acceptedBid));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectResponse response = projectService.cancelProject(clientUser, 1L, "Client backed out");

        assertThat(response.getStatus()).isEqualTo(ProjectStatus.CANCELLED);
        assertThat(acceptedBid.getStatus()).isEqualTo(BidStatus.REJECTED);
        verify(leadService).addLeadCredits(eq(builderUser), eq(1),
                eq(LeadTransaction.TransactionType.REFUND), anyString());
    }

    @Test
    @DisplayName("Cancellation requires a reason")
    void cancelProject_WithoutReason_ShouldThrowException() {
        assertThatThrownBy(() -> projectService.cancelProject(clientUser, 1L, "  "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("reason is required");
    }

    @Test
    @DisplayName("Cancellation is blocked once the project is in progress")
    void cancelProject_InProgress_ShouldThrowException() {
        testProject.setStatus(ProjectStatus.IN_PROGRESS);
        when(projectRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testProject));

        assertThatThrownBy(() -> projectService.cancelProject(clientUser, 1L, "Too late"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("no longer be cancelled");
    }

    @Test
    @DisplayName("Should throw exception when non-owner tries to publish")
    void publishProject_WithNonOwner_ShouldThrowException() {
        // Given
        User anotherUser = User.builder()
                .role(UserRole.CLIENT)
                .build();
        anotherUser.setId(2L);

        when(projectRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testProject));

        // When/Then
        assertThatThrownBy(() -> projectService.publishProject(anotherUser, 1L))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("You don't have access to this project");
    }
}
