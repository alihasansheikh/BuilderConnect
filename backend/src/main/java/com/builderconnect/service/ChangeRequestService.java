package com.builderconnect.service;

import com.builderconnect.dto.request.ChangeRequestCreateRequest;
import com.builderconnect.dto.response.ChangeRequestResponse;
import com.builderconnect.entity.ChangeRequest;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.ChangeRequestRepository;
import com.builderconnect.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Service for project change request management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChangeRequestService {

    private final ChangeRequestRepository changeRequestRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    /**
     * Submit a change request for a project.
     */
    @Transactional
    public ChangeRequestResponse submit(User user, Long projectId, ChangeRequestCreateRequest request) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        // Verify user is a party to the project
        boolean isClient = project.getClient().getId().equals(user.getId());
        boolean isBuilder = project.getAwardedBuilder() != null && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isClient && !isBuilder) {
            throw new UnauthorizedException("You are not a party to this project");
        }

        ChangeRequest.ChangeType changeType;
        try {
            changeType = ChangeRequest.ChangeType.valueOf(request.getChangeType());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid change type: " + request.getChangeType());
        }

        ChangeRequest cr = ChangeRequest.builder()
                .project(project)
                .requestedBy(user)
                .changeType(changeType)
                .title(request.getTitle())
                .description(request.getDescription())
                .proposedValue(request.getProposedValue())
                .build();

        cr = changeRequestRepository.save(cr);

        auditService.logAction(user, "CHANGE_REQUEST_SUBMITTED", "CHANGE_REQUEST", cr.getId(),
                "Submitted " + changeType + " change request for project: " + project.getTitle());

        notifyCounterpartyOfSubmission(cr, user);

        log.info("Change request {} submitted for project {} by user {}",
                cr.getId(), projectId, user.getId());

        return ChangeRequestResponse.fromEntity(cr);
    }

    /**
     * Approve a change request.
     */
    @Transactional
    public ChangeRequestResponse approve(User user, Long changeRequestId) {
        ChangeRequest cr = changeRequestRepository.findById(changeRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found: " + changeRequestId));

        if (!cr.isPending()) {
            throw new BadRequestException("Change request is not pending");
        }

        // The other party should approve (client approves builder's request, vice versa)
        Project project = cr.getProject();
        boolean isClient = project.getClient().getId().equals(user.getId());
        boolean isBuilder = project.getAwardedBuilder() != null && project.getAwardedBuilder().getId().equals(user.getId());

        if (!isClient && !isBuilder) {
            throw new UnauthorizedException("You are not a party to this project");
        }

        if (cr.getRequestedBy().getId().equals(user.getId())) {
            throw new BadRequestException("You cannot approve your own change request");
        }

        cr.approve(user);
        applyApprovedChange(cr, project);
        changeRequestRepository.save(cr);

        auditService.logAction(user, "CHANGE_REQUEST_APPROVED", "CHANGE_REQUEST", cr.getId(),
                "Approved change request: " + cr.getTitle());

        notifyRequesterOfOutcome(cr, "approved");

        log.info("Change request {} approved by user {}", changeRequestId, user.getId());

        return ChangeRequestResponse.fromEntity(cr);
    }

    /**
     * Reject a change request.
     */
    @Transactional
    public ChangeRequestResponse reject(User user, Long changeRequestId, String reason) {
        ChangeRequest cr = changeRequestRepository.findById(changeRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found: " + changeRequestId));

        if (!cr.isPending()) {
            throw new BadRequestException("Change request is not pending");
        }

        Project project = cr.getProject();
        boolean isClient = project.getClient().getId().equals(user.getId());
        boolean isBuilder = project.getAwardedBuilder() != null && project.getAwardedBuilder().getId().equals(user.getId());

        if (!isClient && !isBuilder) {
            throw new UnauthorizedException("You are not a party to this project");
        }

        if (cr.getRequestedBy().getId().equals(user.getId())) {
            throw new BadRequestException("You cannot reject your own change request");
        }

        cr.reject(user, reason);
        changeRequestRepository.save(cr);

        auditService.logAction(user, "CHANGE_REQUEST_REJECTED", "CHANGE_REQUEST", cr.getId(),
                "Rejected change request: " + cr.getTitle());

        notifyRequesterOfOutcome(cr, "rejected");

        log.info("Change request {} rejected by user {}", changeRequestId, user.getId());

        return ChangeRequestResponse.fromEntity(cr);
    }

    /**
     * Get all change requests for a project.
     * Restricted to the project client, the awarded builder, or admins.
     */
    @Transactional(readOnly = true)
    public List<ChangeRequestResponse> getByProject(User user, Long projectId) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        boolean isClient = project.getClient().getId().equals(user.getId());
        boolean isBuilder = project.getAwardedBuilder() != null
                && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isClient && !isBuilder && !user.isAdmin()) {
            throw new UnauthorizedException("You do not have access to this project's change requests");
        }

        return changeRequestRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(ChangeRequestResponse::fromEntity)
                .toList();
    }

    /**
     * An approved BUDGET or TIMELINE change is applied to the project itself while work is in
     * progress (the requested value is parsed from the free-text proposedValue; an unparseable
     * value leaves the request approved but advisory). SCOPE changes are always advisory.
     */
    private void applyApprovedChange(ChangeRequest cr, Project project) {
        if (project.getStatus() != ProjectStatus.IN_PROGRESS) {
            return;
        }
        switch (cr.getChangeType()) {
            case BUDGET -> applyBudgetChange(cr, project);
            case TIMELINE -> applyTimelineChange(cr, project);
            case SCOPE -> log.debug("Change request {} is SCOPE — advisory only", cr.getId());
        }
    }

    private void applyBudgetChange(ChangeRequest cr, Project project) {
        BigDecimal newBudget = parseAmount(cr.getProposedValue());
        if (newBudget == null || newBudget.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("Change request {} BUDGET value '{}' is not a valid amount — approved as advisory only",
                    cr.getId(), cr.getProposedValue());
            return;
        }
        cr.setCurrentValue(project.getFinalBudget() != null
                ? project.getFinalBudget().toPlainString() : null);
        project.setFinalBudget(newBudget);
        projectRepository.save(project);
        log.info("Change request {} applied: project {} finalBudget -> {}",
                cr.getId(), project.getId(), newBudget.toPlainString());
    }

    private void applyTimelineChange(ChangeRequest cr, Project project) {
        LocalDate newDeadline = parseDate(cr.getProposedValue());
        if (newDeadline == null) {
            log.info("Change request {} TIMELINE value '{}' is not a valid date — approved as advisory only",
                    cr.getId(), cr.getProposedValue());
            return;
        }
        cr.setCurrentValue(project.getDeadline() != null ? project.getDeadline().toString() : null);
        project.setDeadline(newDeadline);
        project.setExpectedCompletionDate(newDeadline);
        projectRepository.save(project);
        log.info("Change request {} applied: project {} deadline -> {}",
                cr.getId(), project.getId(), newDeadline);
    }

    private BigDecimal parseAmount(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.replaceAll("[^0-9.]", "");
        if (cleaned.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /**
     * Notify the counterparty (client notifies awarded builder and vice versa)
     * that a new change request was submitted. Skipped when the project has no
     * awarded builder yet (change request filed before award).
     */
    private void notifyCounterpartyOfSubmission(ChangeRequest cr, User requester) {
        Project project = cr.getProject();
        boolean requesterIsClient = project.getClient().getId().equals(requester.getId());
        User counterparty = requesterIsClient ? project.getAwardedBuilder() : project.getClient();
        if (counterparty == null) {
            log.debug("No awarded builder on project {} — skipping change request notification",
                    project.getId());
            return;
        }

        notificationService.createNotification(
                counterparty,
                NotificationType.SYSTEM_ANNOUNCEMENT,
                "New Change Request",
                "New change request on " + project.getTitle() + ": " + cr.getTitle(),
                "CHANGE_REQUEST",
                cr.getId(),
                projectUrlFor(counterparty, project));
    }

    /**
     * Notify the requester that their change request was approved or rejected.
     */
    private void notifyRequesterOfOutcome(ChangeRequest cr, String outcome) {
        Project project = cr.getProject();
        User requester = cr.getRequestedBy();

        notificationService.createNotification(
                requester,
                NotificationType.SYSTEM_ANNOUNCEMENT,
                "Change Request " + ("approved".equals(outcome) ? "Approved" : "Rejected"),
                "Your change request \"" + cr.getTitle() + "\" on " + project.getTitle()
                        + " was " + outcome,
                "CHANGE_REQUEST",
                cr.getId(),
                projectUrlFor(requester, project));
    }

    /**
     * Build the role-appropriate project URL for a notification recipient.
     */
    private String projectUrlFor(User recipient, Project project) {
        boolean isClient = project.getClient().getId().equals(recipient.getId());
        return (isClient ? "/client/projects/" : "/builder/projects/") + project.getId();
    }
}
