package com.builderconnect.service;

import com.builderconnect.dto.request.DisputeCommentRequest;
import com.builderconnect.dto.request.DisputeCreateRequest;
import com.builderconnect.dto.response.DisputeCommentResponse;
import com.builderconnect.dto.response.DisputeResponse;
import com.builderconnect.entity.Dispute;
import com.builderconnect.entity.Dispute.DisputeStatus;
import com.builderconnect.entity.Dispute.DisputeType;
import com.builderconnect.entity.DisputeComment;
import com.builderconnect.entity.Milestone;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.DisputeCommentRepository;
import com.builderconnect.repository.DisputeRepository;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.time.Year;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Service for dispute management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DisputeService {

    /** Post-award lifecycle states in which the client/builder relationship exists. */
    private static final Set<ProjectStatus> DISPUTABLE_PROJECT_STATUSES = EnumSet.of(
            ProjectStatus.AWARDED, ProjectStatus.CONTRACT_PENDING, ProjectStatus.IN_PROGRESS,
            ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED);

    /** Must match the SQL ENUM on disputes.resolution_type. */
    private static final List<String> LEGAL_RESOLUTION_TYPES = List.of(
            "FAVOR_FILER", "FAVOR_RESPONDENT", "MUTUAL_AGREEMENT", "PARTIAL", "DISMISSED", "ESCALATED");

    private final DisputeRepository disputeRepository;
    private final DisputeCommentRepository disputeCommentRepository;
    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * File a new dispute on a project.
     */
    @Transactional
    public DisputeResponse fileDispute(User user, Long projectId, DisputeCreateRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        if (!DISPUTABLE_PROJECT_STATUSES.contains(project.getStatus())) {
            throw new BadRequestException(
                    "Disputes can only be filed on awarded, in-progress, or completed projects");
        }

        User client = project.getClient();
        User awardedBuilder = project.getAwardedBuilder();
        boolean filerIsClient = client != null && user.getId().equals(client.getId());
        boolean filerIsBuilder = awardedBuilder != null && user.getId().equals(awardedBuilder.getId());
        if (!filerIsClient && !filerIsBuilder) {
            throw new UnauthorizedException(
                    "Only the project client or the awarded builder can file a dispute on this project");
        }

        // The respondent is always the other party on the project
        User filedAgainst = filerIsClient ? awardedBuilder : client;
        if (filedAgainst == null || Boolean.TRUE.equals(filedAgainst.getDeleted())) {
            throw new BadRequestException("The other party on this project is no longer available");
        }
        if (request.getFiledAgainstId() != null && !request.getFiledAgainstId().equals(filedAgainst.getId())) {
            throw new BadRequestException("Disputes can only be filed against the other party on the project");
        }

        DisputeType disputeType;
        try {
            disputeType = DisputeType.valueOf(request.getDisputeType());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid dispute type: " + request.getDisputeType());
        }

        Milestone milestone = null;
        if (request.getMilestoneId() != null) {
            milestone = milestoneRepository.findById(request.getMilestoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + request.getMilestoneId()));

            if (!milestone.getProject().getId().equals(projectId)) {
                throw new BadRequestException("Milestone does not belong to the specified project");
            }
        }

        Dispute dispute = Dispute.builder()
                .disputeNumber("TMP-" + UUID.randomUUID().toString().substring(0, 13))
                .project(project)
                .milestone(milestone)
                .filedBy(user)
                .filedAgainst(filedAgainst)
                .disputeType(disputeType)
                .title(request.getTitle())
                .description(request.getDescription())
                .evidence(request.getEvidence())
                .disputedAmount(request.getDisputedAmount())
                .build();

        dispute = disputeRepository.save(dispute);
        // PK-derived number — race-free (unlike the old findMaxId()+1 pattern)
        dispute.setDisputeNumber(String.format("DSP-%d-%05d", Year.now().getValue(), dispute.getId()));

        auditService.logAction(user, "DISPUTE_FILED", "DISPUTE", dispute.getId(),
                "Filed dispute: " + dispute.getDisputeNumber() + " - " + request.getTitle()
                        + " on project " + project.getProjectNumber());

        notificationService.notifySupportAgents(NotificationType.DISPUTE_OPENED,
                "New Dispute Filed",
                String.format("Dispute %s filed by %s on project \"%s\".",
                        dispute.getDisputeNumber(), HtmlUtils.htmlEscape(user.getName()),
                        HtmlUtils.htmlEscape(project.getTitle())),
                "dispute", dispute.getId(), "/support/disputes");

        notificationService.createNotification(filedAgainst, NotificationType.DISPUTE_OPENED,
                "Dispute Filed Against You",
                String.format("%s filed dispute %s against you on project \"%s\".",
                        HtmlUtils.htmlEscape(user.getName()), dispute.getDisputeNumber(),
                        HtmlUtils.htmlEscape(project.getTitle())),
                "dispute", dispute.getId(), disputeUrlFor(filedAgainst));

        emailService.sendDisputeFiledEmail(filedAgainst, dispute.getDisputeNumber(), project.getTitle());

        log.info("Dispute {} filed by user {} against user {} on project {}",
                dispute.getDisputeNumber(), user.getId(), filedAgainst.getId(), project.getProjectNumber());

        return DisputeResponse.fromEntity(dispute, 0);
    }

    /**
     * Get a single dispute by ID.
     */
    @Transactional(readOnly = true)
    public DisputeResponse getDispute(User user, Long disputeId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found: " + disputeId));

        // Non-admin/support users can only see disputes they are involved in
        if (!isSupportOrAdmin(user) && !isInvolvedInDispute(user, dispute)) {
            throw new UnauthorizedException("You do not have permission to view this dispute");
        }

        long commentCount = disputeCommentRepository.countByDisputeId(disputeId);
        return DisputeResponse.fromEntity(dispute, commentCount);
    }

    /**
     * Get disputes for the current user (filed by or filed against).
     */
    @Transactional(readOnly = true)
    public Page<DisputeResponse> getUserDisputes(User user, Pageable pageable) {
        return disputeRepository.findByUserInvolved(user.getId(), pageable)
                .map(dispute -> {
                    long commentCount = disputeCommentRepository.countByDisputeId(dispute.getId());
                    return DisputeResponse.fromEntity(dispute, commentCount);
                });
    }

    /**
     * Get all disputes with optional filters (SUPPORT_AGENT/ADMIN only).
     */
    @Transactional(readOnly = true)
    public Page<DisputeResponse> getAllDisputes(String status, String disputeType, Pageable pageable) {
        DisputeStatus disputeStatus = null;
        DisputeType type = null;

        if (status != null && !status.isEmpty()) {
            try {
                disputeStatus = DisputeStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }
        if (disputeType != null && !disputeType.isEmpty()) {
            try {
                type = DisputeType.valueOf(disputeType);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid dispute type: " + disputeType);
            }
        }

        return disputeRepository.findAllWithFilters(disputeStatus, type, pageable)
                .map(dispute -> {
                    long commentCount = disputeCommentRepository.countByDisputeId(dispute.getId());
                    return DisputeResponse.fromEntity(dispute, commentCount);
                });
    }

    /**
     * Escalate a dispute to admins. Support agents mediate disputes day-to-day;
     * escalation moves one up to admin oversight and flags it on their queue.
     */
    @Transactional
    public DisputeResponse escalateDispute(User user, Long disputeId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found: " + disputeId));

        if (dispute.isResolved()) {
            throw new BadRequestException("Cannot escalate a resolved dispute");
        }
        if (dispute.getStatus() == DisputeStatus.ESCALATED) {
            throw new BadRequestException("Dispute is already escalated");
        }

        dispute.escalate();
        dispute = disputeRepository.save(dispute);

        auditService.logAction(user, "DISPUTE_ESCALATED", "DISPUTE", dispute.getId(),
                "Escalated dispute " + dispute.getDisputeNumber() + " to admins");

        notificationService.notifyAdmins(NotificationType.DISPUTE_OPENED,
                "Dispute Escalated",
                String.format("Dispute %s (\"%s\") was escalated by %s and needs admin attention.",
                        dispute.getDisputeNumber(), HtmlUtils.htmlEscape(dispute.getTitle()),
                        HtmlUtils.htmlEscape(user.getName())),
                "dispute", dispute.getId(), "/support/disputes");

        log.info("Dispute {} escalated by user {}", dispute.getDisputeNumber(), user.getId());

        long commentCount = disputeCommentRepository.countByDisputeId(disputeId);
        return DisputeResponse.fromEntity(dispute, commentCount);
    }

    /**
     * Update dispute status.
     */
    @Transactional
    public DisputeResponse updateStatus(User user, Long disputeId, String newStatus) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found: " + disputeId));

        DisputeStatus status;
        try {
            status = DisputeStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + newStatus);
        }

        String oldStatus = dispute.getStatus().name();
        dispute.updateStatus(status);
        dispute = disputeRepository.save(dispute);

        auditService.logAction(user, "DISPUTE_STATUS_UPDATED", "DISPUTE", dispute.getId(),
                "Updated dispute " + dispute.getDisputeNumber()
                        + " status from " + oldStatus + " to " + newStatus);

        log.info("Dispute {} status updated from {} to {} by user {}",
                dispute.getDisputeNumber(), oldStatus, newStatus, user.getId());

        long commentCount = disputeCommentRepository.countByDisputeId(disputeId);
        return DisputeResponse.fromEntity(dispute, commentCount);
    }

    /**
     * Resolve a dispute.
     */
    @Transactional
    public DisputeResponse resolveDispute(User user, Long disputeId, Map<String, String> body) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found: " + disputeId));

        if (dispute.isResolved()) {
            throw new BadRequestException("Dispute is already resolved");
        }

        String resolutionType = body.get("resolutionType");
        if (resolutionType == null || !LEGAL_RESOLUTION_TYPES.contains(resolutionType)) {
            throw new BadRequestException("resolutionType must be one of: "
                    + String.join(", ", LEGAL_RESOLUTION_TYPES));
        }
        String resolutionDetails = body.getOrDefault("resolutionDetails", "Resolved");
        BigDecimal resolutionAmount = null;
        if (body.containsKey("resolutionAmount") && body.get("resolutionAmount") != null) {
            try {
                resolutionAmount = new BigDecimal(body.get("resolutionAmount"));
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid resolution amount");
            }
        }

        dispute.resolve(resolutionType, resolutionDetails, resolutionAmount);
        dispute = disputeRepository.save(dispute);

        auditService.logAction(user, "DISPUTE_RESOLVED", "DISPUTE", dispute.getId(),
                "Resolved dispute " + dispute.getDisputeNumber()
                        + " with type: " + resolutionType);

        String resolvedMessage = String.format("Dispute %s (\"%s\") has been resolved: %s",
                dispute.getDisputeNumber(), HtmlUtils.htmlEscape(dispute.getTitle()),
                HtmlUtils.htmlEscape(resolutionDetails));
        for (User party : List.of(dispute.getFiledBy(), dispute.getFiledAgainst())) {
            notificationService.createNotification(party, NotificationType.DISPUTE_RESOLVED,
                    "Dispute Resolved", resolvedMessage,
                    "dispute", dispute.getId(), disputeUrlFor(party));
        }

        log.info("Dispute {} resolved by user {}", dispute.getDisputeNumber(), user.getId());

        long commentCount = disputeCommentRepository.countByDisputeId(disputeId);
        return DisputeResponse.fromEntity(dispute, commentCount);
    }

    /**
     * Add a comment to a dispute.
     */
    @Transactional
    public DisputeCommentResponse addComment(User user, Long disputeId, DisputeCommentRequest request) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found: " + disputeId));

        // Involved parties or support/admin can comment
        if (!isSupportOrAdmin(user) && !isInvolvedInDispute(user, dispute)) {
            throw new UnauthorizedException("You do not have permission to comment on this dispute");
        }

        // Only support/admin can post internal notes
        boolean isInternal = Boolean.TRUE.equals(request.getIsInternal()) && isSupportOrAdmin(user);

        DisputeComment comment = DisputeComment.builder()
                .dispute(dispute)
                .user(user)
                .comment(request.getComment())
                .isInternal(isInternal)
                .build();

        comment = disputeCommentRepository.save(comment);

        // A support/admin comment on a freshly filed dispute moves it into review.
        if (isSupportOrAdmin(user) && dispute.getStatus() == DisputeStatus.FILED) {
            dispute.updateStatus(DisputeStatus.UNDER_REVIEW);
            disputeRepository.save(dispute);
        }

        log.info("Comment added to dispute {} by user {}", dispute.getDisputeNumber(), user.getId());

        return DisputeCommentResponse.fromEntity(comment);
    }

    /**
     * Get all comments for a dispute.
     */
    @Transactional(readOnly = true)
    public List<DisputeCommentResponse> getComments(User user, Long disputeId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found: " + disputeId));

        // Non-admin/support users can only see disputes they are involved in
        if (!isSupportOrAdmin(user) && !isInvolvedInDispute(user, dispute)) {
            throw new UnauthorizedException("You do not have permission to view comments for this dispute");
        }

        List<DisputeComment> comments = disputeCommentRepository.findByDisputeIdOrderByCreatedAtAsc(disputeId);

        // Filter out internal notes for non-support/admin users
        if (!isSupportOrAdmin(user)) {
            comments = comments.stream()
                    .filter(c -> !Boolean.TRUE.equals(c.getIsInternal()))
                    .toList();
        }

        return comments.stream()
                .map(DisputeCommentResponse::fromEntity)
                .toList();
    }

    /** Support/admin get the agent disputes page; other parties their help-page dispute view. */
    private String disputeUrlFor(User user) {
        if (isSupportOrAdmin(user)) {
            return "/support/disputes";
        }
        return "/" + roleSegment(user) + "/support?tab=disputes";
    }

    private String roleSegment(User user) {
        return switch (user.getRole()) {
            case CLIENT -> "client";
            case BUILDER -> "builder";
            case SUPPLIER -> "supplier";
            case SUPPORT_AGENT -> "support";
            case ADMIN, SUPER_ADMIN -> "admin";
        };
    }

    private boolean isSupportOrAdmin(User user) {
        return user.getRole() == UserRole.SUPPORT_AGENT ||
               user.getRole() == UserRole.ADMIN ||
               user.getRole() == UserRole.SUPER_ADMIN;
    }

    private boolean isInvolvedInDispute(User user, Dispute dispute) {
        Long userId = user.getId();
        return userId.equals(dispute.getFiledBy().getId()) ||
               userId.equals(dispute.getFiledAgainst().getId());
    }
}
