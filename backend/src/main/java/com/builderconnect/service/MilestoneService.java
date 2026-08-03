package com.builderconnect.service;

import com.builderconnect.dto.request.MilestoneCreateRequest;
import com.builderconnect.dto.response.MilestoneResponse;
import com.builderconnect.entity.Milestone;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.MilestoneStatus;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.util.SecurityUtils;
import com.builderconnect.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for milestone management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<MilestoneResponse> getProjectMilestones(User user, Long projectId) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        boolean isClient = project.getClient() != null
            && project.getClient().getId().equals(user.getId());
        boolean isAwardedBuilder = project.getAwardedBuilder() != null
            && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isClient && !isAwardedBuilder && !user.isAdmin()) {
            throw new UnauthorizedException("You do not have access to this project's milestones");
        }

        return milestoneRepository.findByProjectIdOrderBySequenceOrderAsc(projectId)
            .stream()
            .map(MilestoneResponse::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional
    public MilestoneResponse createMilestone(User builder, Long projectId, MilestoneCreateRequest request) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        validateAwardedBuilder(project, builder);
        SecurityUtils.validateNotSuspended(builder);
        validateSchedulableStatus(project);
        validateBudgetCap(project, sumExistingAmounts(projectId), request.getAmount());

        Integer maxOrder = milestoneRepository.findMaxSequenceOrder(projectId);
        Milestone milestone = Milestone.builder()
            .project(project)
            .title(request.getTitle())
            .description(request.getDescription())
            .paymentAmount(request.getAmount())
            .dueDate(request.getDueDate())
            .sequenceOrder((maxOrder != null ? maxOrder : 0) + 1)
            .status(MilestoneStatus.PENDING)
            .build();
        Milestone saved = milestoneRepository.save(milestone);

        autoStartIfProjectActive(project, saved);
        notifyClientMilestoneAdded(project, saved);

        log.info("Milestone {} created on project {} by builder {}", saved.getId(), projectId, builder.getId());
        return MilestoneResponse.fromEntity(saved);
    }

    @Transactional
    public MilestoneResponse updateMilestone(User builder, Long milestoneId, MilestoneCreateRequest request) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = milestone.getProject();
        validateAwardedBuilder(project, builder);
        SecurityUtils.validateNotSuspended(builder);

        if (milestone.getStatus() != MilestoneStatus.PENDING) {
            throw new BadRequestException("Only a pending milestone can be edited");
        }

        BigDecimal othersTotal = sumExistingAmounts(project.getId())
            .subtract(milestone.getPaymentAmount() != null ? milestone.getPaymentAmount() : BigDecimal.ZERO);
        validateBudgetCap(project, othersTotal, request.getAmount());

        milestone.setTitle(request.getTitle());
        milestone.setDescription(request.getDescription());
        milestone.setPaymentAmount(request.getAmount());
        milestone.setDueDate(request.getDueDate());
        Milestone saved = milestoneRepository.save(milestone);

        log.info("Milestone {} updated by builder {}", milestoneId, builder.getId());
        return MilestoneResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteMilestone(User builder, Long milestoneId) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = milestone.getProject();
        validateAwardedBuilder(project, builder);
        SecurityUtils.validateNotSuspended(builder);

        if (milestone.getStatus() != MilestoneStatus.PENDING) {
            throw new BadRequestException("Only a pending milestone can be deleted");
        }

        if (milestoneId.equals(project.getCurrentMilestoneId())) {
            project.setCurrentMilestoneId(null);
            projectRepository.save(project);
        }
        milestoneRepository.delete(milestone);

        log.info("Milestone {} deleted from project {} by builder {}", milestoneId, project.getId(), builder.getId());
    }

    @Transactional
    public MilestoneResponse completeMilestone(User builder, Long milestoneId, String evidence) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = milestone.getProject();
        if (project.getAwardedBuilder() == null) {
            throw new BadRequestException("Project has no awarded builder");
        }
        if (!project.getAwardedBuilder().getId().equals(builder.getId())) {
            throw new UnauthorizedException("You are not the builder for this project");
        }
        SecurityUtils.validateNotSuspended(builder);

        // IN_PROGRESS = normal completion; REJECTED = builder re-submits after client rejection (rework).
        boolean canComplete = milestone.getStatus() == MilestoneStatus.IN_PROGRESS
            || milestone.getStatus() == MilestoneStatus.REJECTED;
        if (!canComplete) {
            throw new IllegalStateException("Milestone cannot be completed in its current state: " + milestone.getStatus());
        }

        milestone.markComplete(evidence);
        Milestone saved = milestoneRepository.save(milestone);

        notificationService.notifyMilestoneCompleted(project, saved);
        emailService.sendMilestoneCompletedEmail(project.getClient(), project.getTitle(), saved.getTitle());

        log.info("Milestone {} marked complete by builder {}", milestoneId, builder.getId());
        return MilestoneResponse.fromEntity(saved);
    }

    @Transactional
    public MilestoneResponse approveMilestone(User client, Long milestoneId) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = milestone.getProject();
        if (!project.getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You are not the client for this project");
        }
        SecurityUtils.validateNotSuspended(client);

        if (!milestone.canBeApproved()) {
            throw new IllegalStateException("Milestone cannot be approved in its current state: " + milestone.getStatus());
        }

        milestone.approve(client.getId());
        Milestone saved = milestoneRepository.save(milestone);

        notificationService.notifyMilestoneApproved(project, saved);

        log.info("Milestone {} approved by client {}", milestoneId, client.getId());
        return MilestoneResponse.fromEntity(saved);
    }

    @Transactional
    public MilestoneResponse rejectMilestone(User client, Long milestoneId, String reason) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = milestone.getProject();
        if (!project.getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You are not the client for this project");
        }
        SecurityUtils.validateNotSuspended(client);

        if (!milestone.canBeApproved()) {
            throw new IllegalStateException("Milestone cannot be rejected in its current state: " + milestone.getStatus());
        }

        milestone.reject(reason);
        Milestone saved = milestoneRepository.save(milestone);

        User builder = project.getAwardedBuilder();
        if (builder != null) {
            notificationService.createNotification(builder, NotificationType.SYSTEM_ANNOUNCEMENT,
                "Milestone Changes Requested",
                "The client requested changes on milestone \"" + saved.getTitle() + "\" of project \""
                    + project.getTitle() + "\": " + reason,
                "milestone", saved.getId(), "/builder/projects/" + project.getId());
            emailService.sendMilestoneRejectedEmail(builder, saved.getTitle(), project.getTitle(), reason);
        }

        log.info("Milestone {} rejected by client {}", milestoneId, client.getId());
        return MilestoneResponse.fromEntity(saved);
    }

    /**
     * Records a client's off-platform payment for a pending milestone: stores the uploaded proof,
     * marks the milestone PAID, notifies the builder, and completes the project when every
     * milestone is fully paid.
     */
    @Transactional
    public MilestoneResponse markMilestonePaid(User client, Long milestoneId, MultipartFile proof, String note) {
        // Lock the milestone row so two concurrent pay attempts on the same milestone serialize here
        // (the second one sees PAID and is rejected — prevents a double payment).
        Milestone milestone = milestoneRepository.findByIdForUpdate(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = projectRepository.findByIdAndDeletedFalse(milestone.getProject().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (project.getClient() == null || !project.getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You don't have permission to pay for this project");
        }
        SecurityUtils.validateNotSuspended(client);

        // Work-gated payment: the builder marks the milestone COMPLETED, the client APPROVES the
        // work, and only then can the client pay it.
        if (milestone.getStatus() == MilestoneStatus.PAID || milestone.getStatus() == MilestoneStatus.CONFIRMED) {
            throw new BadRequestException("This milestone has already been paid. Current status: " + milestone.getStatus());
        }
        if (milestone.getStatus() != MilestoneStatus.APPROVED) {
            if (milestone.canBeApproved()) {
                throw new BadRequestException("Approve the completed work before paying");
            }
            throw new BadRequestException("Builder has not marked this milestone complete yet");
        }
        if (proof == null || proof.isEmpty()) {
            throw new BadRequestException("Payment proof is required");
        }

        BigDecimal amount = milestone.getPaymentAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Milestone has no payment amount set");
        }

        String proofUrl = fileStorageService.storePaymentProof(proof, milestoneId);
        milestone.markPaid(proofUrl, note);
        milestoneRepository.save(milestone);

        User builder = project.getAwardedBuilder();
        if (builder != null) {
            notificationService.createNotification(builder, NotificationType.PAYMENT_RECEIVED,
                "Payment Recorded",
                "Payment recorded for milestone \"" + milestone.getTitle() + "\". Please confirm receipt.",
                "milestone", milestone.getId(), "/builder/projects/" + project.getId());
            emailService.sendMilestonePaymentMarkedEmail(builder, milestone.getTitle(),
                project.getTitle(), String.format("%,.2f", amount));
        }

        completeProjectIfFullyPaid(project);

        auditService.logAction(client, "MILESTONE_PAID", "MILESTONE", milestoneId,
            "Recorded payment of PKR " + amount + " for milestone: " + milestone.getTitle());

        return MilestoneResponse.fromEntity(milestone);
    }

    /**
     * The awarded builder confirms receipt of a milestone's off-platform payment (PAID → CONFIRMED)
     * and the client is notified.
     */
    @Transactional
    public MilestoneResponse confirmMilestonePayment(User builder, Long milestoneId) {
        Milestone milestone = milestoneRepository.findByIdForUpdate(milestoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        Project project = milestone.getProject();
        User awardedBuilder = project.getAwardedBuilder();
        if (awardedBuilder == null || !awardedBuilder.getId().equals(builder.getId())) {
            throw new UnauthorizedException("You don't have permission to confirm payment for this project");
        }
        SecurityUtils.validateNotSuspended(builder);

        if (milestone.getStatus() != MilestoneStatus.PAID) {
            throw new BadRequestException("Only a paid milestone can be confirmed. Current status: " + milestone.getStatus());
        }

        milestone.confirmPayment();
        milestoneRepository.save(milestone);

        User client = project.getClient();
        if (client != null) {
            notificationService.createNotification(client, NotificationType.PAYMENT_RELEASED,
                "Payment Confirmed",
                "Payment confirmed for milestone \"" + milestone.getTitle() + "\" by the builder.",
                "milestone", milestone.getId(), "/client/projects/" + project.getId());
            emailService.sendMilestonePaymentConfirmedEmail(client, milestone.getTitle(),
                project.getTitle());
        }

        startNextPendingMilestone(project);

        auditService.logAction(builder, "MILESTONE_PAYMENT_CONFIRMED", "MILESTONE", milestoneId,
            "Confirmed payment receipt for milestone: " + milestone.getTitle());

        return MilestoneResponse.fromEntity(milestone);
    }

    /**
     * After a milestone payment is confirmed, kick off the next PENDING milestone (by sequence)
     * so the pipeline keeps moving without a manual start. No-op when the project is no longer
     * active or another milestone is already in progress.
     */
    private void startNextPendingMilestone(Project project) {
        if (project.getStatus() != ProjectStatus.IN_PROGRESS) {
            return;
        }
        List<Milestone> all = milestoneRepository.findByProjectIdOrderBySequenceOrderAsc(project.getId());
        boolean hasActiveMilestone = all.stream()
            .anyMatch(m -> m.getStatus() == MilestoneStatus.IN_PROGRESS);
        if (hasActiveMilestone) {
            return;
        }
        Milestone next = all.stream()
            .filter(m -> m.getStatus() == MilestoneStatus.PENDING)
            .findFirst()
            .orElse(null);
        if (next == null) {
            return;
        }

        next.start();
        milestoneRepository.save(next);
        project.setCurrentMilestoneId(next.getId());
        projectRepository.save(project);

        User builder = project.getAwardedBuilder();
        if (builder != null) {
            notificationService.createNotification(builder, NotificationType.SYSTEM_ANNOUNCEMENT,
                "Next Milestone Started",
                "Milestone \"" + next.getTitle() + "\" on project \"" + project.getTitle()
                    + "\" is now in progress.",
                "milestone", next.getId(), "/builder/projects/" + project.getId());
        }
        log.info("Milestone {} auto-started on project {} after payment confirmation",
            next.getId(), project.getId());
    }

    /**
     * Marks the project COMPLETED once every milestone is PAID or CONFIRMED and the recorded
     * payment total covers the awarded budget. An under-scheduled project (milestone amounts
     * summing to less than the final budget) stays IN_PROGRESS.
     */
    private void completeProjectIfFullyPaid(Project project) {
        List<Milestone> all = milestoneRepository.findByProjectIdOrderBySequenceOrderAsc(project.getId());
        if (all.isEmpty() || project.getStatus() == ProjectStatus.COMPLETED) {
            return;
        }

        boolean allPaid = all.stream().allMatch(m ->
            m.getStatus() == MilestoneStatus.PAID || m.getStatus() == MilestoneStatus.CONFIRMED);
        if (!allPaid) {
            return;
        }

        // Complete once every milestone the builder scheduled is paid. The builder owns the
        // schedule (amounts are capped at the award), so a deliberately smaller schedule that is
        // fully paid still completes the project rather than stranding it IN_PROGRESS forever.
        project.complete();
        project.setCurrentMilestoneId(null);
        projectRepository.save(project);

        User client = project.getClient();
        User builder = project.getAwardedBuilder();
        if (client != null) {
            notificationService.createNotification(client, NotificationType.SYSTEM_ANNOUNCEMENT,
                "Project Completed",
                "All milestones on \"" + project.getTitle() + "\" are paid — the project is complete."
                    + " Share your experience by leaving your builder a review.",
                "project", project.getId(), "/client/projects/" + project.getId() + "?tab=reviews");
            emailService.sendProjectCompletedEmail(client, project.getTitle());
        }
        if (builder != null) {
            notificationService.createNotification(builder, NotificationType.SYSTEM_ANNOUNCEMENT,
                "Project Completed",
                "All milestones on \"" + project.getTitle() + "\" are paid — the project is complete."
                    + " Congratulations!",
                "project", project.getId(), "/builder/projects/" + project.getId());
            emailService.sendProjectCompletedEmail(builder, project.getTitle());
        }

        auditService.logAction(project.getClient(), "PROJECT_COMPLETED", "PROJECT", project.getId(),
            "All milestones paid; project completed: " + project.getTitle());
    }

    // ---------- private helpers ----------

    private void validateAwardedBuilder(Project project, User builder) {
        if (project.getAwardedBuilder() == null
            || !project.getAwardedBuilder().getId().equals(builder.getId())) {
            throw new UnauthorizedException("You are not the awarded builder for this project");
        }
    }

    private void validateSchedulableStatus(Project project) {
        boolean schedulable = project.getStatus() == ProjectStatus.AWARDED
            || project.getStatus() == ProjectStatus.CONTRACT_PENDING
            || project.getStatus() == ProjectStatus.IN_PROGRESS;
        if (!schedulable) {
            throw new BadRequestException(
                "Milestones can only be scheduled while the project is awarded, contract-pending, or in progress"
                + " (current status: " + project.getStatus() + ")");
        }
    }

    private BigDecimal sumExistingAmounts(Long projectId) {
        BigDecimal sum = milestoneRepository.sumPaymentAmountByProjectId(projectId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    /**
     * Enforces the user-approved cap: the milestone schedule total may never exceed the
     * awarded budget. otherMilestonesTotal excludes the milestone being edited (if any).
     */
    private void validateBudgetCap(Project project, BigDecimal otherMilestonesTotal, BigDecimal newAmount) {
        BigDecimal budget = project.getFinalBudget();
        if (budget == null) {
            throw new BadRequestException("Project has no awarded budget yet");
        }
        if (otherMilestonesTotal.add(newAmount).compareTo(budget) > 0) {
            BigDecimal remaining = budget.subtract(otherMilestonesTotal).max(BigDecimal.ZERO);
            throw new BadRequestException(
                "Milestone total would exceed the awarded budget (Rs " + budget.toPlainString()
                + "). You can still schedule Rs " + remaining.toPlainString() + ".");
        }
    }

    /**
     * If the project is already IN_PROGRESS with no active milestone (e.g. the schedule is
     * being built after the contract was signed), start the newly created milestone so the
     * pipeline never stalls waiting for a manual kick-off.
     */
    private void autoStartIfProjectActive(Project project, Milestone milestone) {
        if (project.getStatus() != ProjectStatus.IN_PROGRESS) {
            return;
        }
        boolean hasActiveMilestone =
            milestoneRepository.countByProjectIdAndStatus(project.getId(), MilestoneStatus.IN_PROGRESS) > 0;
        if (hasActiveMilestone || project.getCurrentMilestoneId() != null) {
            return;
        }
        milestone.start();
        milestoneRepository.save(milestone);
        project.setCurrentMilestoneId(milestone.getId());
        projectRepository.save(project);
        log.info("Milestone {} auto-started on active project {}", milestone.getId(), project.getId());
    }

    private void notifyClientMilestoneAdded(Project project, Milestone milestone) {
        notificationService.createNotification(
            project.getClient(),
            NotificationType.SYSTEM_ANNOUNCEMENT,
            "Milestone schedule updated",
            "Your builder added milestone \"" + milestone.getTitle() + "\" (Rs "
                + milestone.getPaymentAmount().toPlainString() + ") to project \"" + project.getTitle() + "\"",
            "PROJECT",
            project.getId(),
            "/client/projects/" + project.getId());
    }
}
