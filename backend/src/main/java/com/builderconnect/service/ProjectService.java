package com.builderconnect.service;

import com.builderconnect.dto.request.ProjectCreateRequest;
import com.builderconnect.dto.response.ProjectResponse;
import com.builderconnect.entity.*;
import com.builderconnect.enums.BidStatus;
import com.builderconnect.enums.MilestoneStatus;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.*;
import com.builderconnect.util.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for project operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final BidRepository bidRepository;
    private final MilestoneRepository milestoneRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final LeadService leadService;
    private final ContractRepository contractRepository;
    private final ProjectCategoryRepository projectCategoryRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ProjectResponse createProject(User client, ProjectCreateRequest request) {
        // Generate project number
        String projectNumber = generateProjectNumber();

        // Resolve the category name from its id (denormalized for display) so the chosen
        // category round-trips instead of being silently lost.
        String categoryName = request.getCategoryId() == null ? null
            : projectCategoryRepository.findById(request.getCategoryId())
                .map(ProjectCategory::getName).orElse(null);

        // Normalize the built-up area to sq ft (prefer an explicit areaSqFt from the request;
        // otherwise derive it from the raw areaValue + areaUnit the wizard collected).
        BigDecimal normalizedAreaSqFt = resolveAreaSqFt(request);

        // Trades are the authoritative skill list from the wizard; fall back to the legacy
        // requiredSkills list when no trades were supplied. Both persist to required_skills JSON.
        List<String> skillsToStore = request.getTrades() != null && !request.getTrades().isEmpty()
            ? request.getTrades() : request.getRequiredSkills();

        // Create project
        Project project = Project.builder()
            .projectNumber(projectNumber)
            .client(client)
            .title(request.getTitle())
            .description(request.getDescription())
            .categoryId(request.getCategoryId())
            .categoryName(categoryName)
            .projectType(request.getProjectType())
            .areaSqFt(normalizedAreaSqFt)
            .propertyType(request.getPropertyType())
            .province(request.getProvince())
            .locationArea(request.getLocationArea())
            .areaValue(request.getAreaValue())
            .areaUnit(request.getAreaUnit())
            .floors(request.getFloors())
            .rooms(request.getRooms())
            .units(request.getUnits())
            .materialsProvidedBy(request.getMaterialsProvidedBy())
            .budgetType(request.getBudgetType() != null ? request.getBudgetType() : "FIXED_RANGE")
            .structureCondition(request.getStructureCondition())
            .preferredStartDate(request.getPreferredStartDate())
            .verifiedBuildersOnly(request.getVerifiedBuildersOnly())
            .city(request.getCity())
            .locationAddress(request.getLocationAddress())
            .locationLatitude(request.getLocationLatitude())
            .locationLongitude(request.getLocationLongitude())
            .budgetMin(request.getBudgetMin())
            .budgetMax(request.getBudgetMax())
            .deadline(request.getDeadline())
            .estimatedDurationDays(request.getEstimatedDurationDays())
            .requiredSkills(toJson(skillsToStore))
            .attachments(toJson(request.getAttachmentUrls()))
            .specialRequirements(request.getSpecialRequirements())
            .isUrgent(request.getIsUrgent())
            .allowPartialBids(request.getAllowPartialBids())
            .isPublic(request.getIsPublic())
            .biddingDeadline(request.getBiddingDeadline())
            .status(ProjectStatus.DRAFT)
            .build();

        project = projectRepository.save(project);

        // Create milestones if provided
        if (request.getMilestones() != null && !request.getMilestones().isEmpty()) {
            createMilestones(project, request.getMilestones());
        }

        auditService.logAction(client, "PROJECT_CREATED", "PROJECT", project.getId(),
            "Created project: " + project.getTitle());

        return ProjectResponse.fromEntity(project);
    }

    @Transactional
    public ProjectResponse publishProject(User client, Long projectId) {
        Project project = getProjectForClient(client, projectId);

        if (project.getStatus() != ProjectStatus.DRAFT) {
            throw new BadRequestException("Only draft projects can be published");
        }

        project.publish();
        project = projectRepository.save(project);

        auditService.logAction(client, "PROJECT_PUBLISHED", "PROJECT", projectId,
            "Published project: " + project.getTitle());

        return ProjectResponse.fromEntity(project);
    }

    /**
     * Project detail with read-access enforcement. Marketplace-visible projects
     * (OPEN/BIDDING and public, client not deleted) are readable by any authenticated
     * user; anything else is limited to the owner client, the awarded builder, a
     * builder who bid on it, or admins. Denial is a 404 — never confirm that a
     * private draft exists.
     */
    @Transactional(readOnly = true)
    public ProjectResponse getProject(User user, Long projectId) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (!canViewProject(user, project)) {
            throw new ResourceNotFoundException("Project not found");
        }
        return ProjectResponse.fromEntity(project);
    }

    private boolean canViewProject(User user, Project project) {
        boolean marketplaceVisible = project.isOpen()
            && !Boolean.FALSE.equals(project.getIsPublic())
            && !Boolean.TRUE.equals(project.getClient().getDeleted());
        if (marketplaceVisible) {
            return true;
        }
        if (user == null) {
            return false;
        }
        if (user.isAdmin()) {
            return true;
        }
        boolean isOwnerClient = project.getClient() != null
            && project.getClient().getId().equals(user.getId());
        boolean isAwardedBuilder = project.getAwardedBuilder() != null
            && project.getAwardedBuilder().getId().equals(user.getId());
        if (isOwnerClient || isAwardedBuilder) {
            return true;
        }
        // A builder who spent a lead credit bidding keeps read access after bidding closes
        return bidRepository.existsByProjectIdAndBuilderId(project.getId(), user.getId());
    }

    @Transactional(readOnly = true)
    public ProjectResponse getClientProject(User client, Long projectId) {
        Project project = getProjectForClient(client, projectId);
        return ProjectResponse.fromEntity(project);
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> getClientProjects(User client, ProjectStatus status, Pageable pageable) {
        Page<Project> projects;
        if (status != null) {
            projects = projectRepository.findByClientIdAndStatusAndDeletedFalse(client.getId(), status, pageable);
        } else {
            projects = projectRepository.findByClientIdAndDeletedFalse(client.getId(), pageable);
        }
        return projects.map(ProjectResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> getBuilderProjects(User builder, ProjectStatus status, Pageable pageable) {
        Page<Project> projects;
        if (status != null) {
            projects = projectRepository.findByAwardedBuilderIdAndStatusAndDeletedFalse(builder.getId(), status, pageable);
        } else {
            projects = projectRepository.findByAwardedBuilderIdAndDeletedFalse(builder.getId(), pageable);
        }
        return projects.map(ProjectResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> getOpenProjects(String city, Long categoryId,
                                                  String propertyType, String province,
                                                  BigDecimal minBudget, BigDecimal maxBudget,
                                                  Pageable pageable) {
        List<ProjectStatus> openStatuses = List.of(ProjectStatus.OPEN, ProjectStatus.BIDDING);

        Page<Project> projects = projectRepository.searchProjects(
            openStatuses, city, categoryId, propertyType, province, minBudget, maxBudget, pageable);

        Map<Long, Integer> bidCounts = countActiveBidsForPage(projects.getContent());
        return projects.map(project ->
            ProjectResponse.summaryFromEntity(project, bidCounts.getOrDefault(project.getId(), 0)));
    }

    /** Bid statuses that count as "active" on a marketplace card. */
    private static final List<BidStatus> ACTIVE_BID_STATUSES =
        List.of(BidStatus.SUBMITTED, BidStatus.UNDER_REVIEW, BidStatus.SHORTLISTED);

    /** One grouped query for the whole page — avoids an N+1 per project card. */
    private Map<Long, Integer> countActiveBidsForPage(List<Project> projects) {
        if (projects.isEmpty()) {
            return Map.of();
        }
        List<Long> projectIds = projects.stream().map(Project::getId).toList();
        return bidRepository.countActiveBidsByProjectIds(projectIds, ACTIVE_BID_STATUSES).stream()
            .collect(Collectors.toMap(
                row -> (Long) row[0],
                row -> ((Long) row[1]).intValue()));
    }

    @Transactional
    public ProjectResponse awardProject(User client, Long projectId, Long bidId) {
        // Use pessimistic lock to prevent race conditions
        Project project = projectRepository.findByIdForUpdate(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You don't have access to this project");
        }

        if (!project.isOpen()) {
            throw new BadRequestException("Project is not open for awarding");
        }

        Bid bid = bidRepository.findById(bidId)
            .orElseThrow(() -> new ResourceNotFoundException("Bid not found"));

        if (!bid.getProject().getId().equals(projectId)) {
            throw new BadRequestException("Bid does not belong to this project");
        }

        if (!bid.isActive()) {
            throw new BadRequestException("Bid is not active");
        }

        if (bid.isExpired()) {
            throw new BadRequestException(
                "This bid has expired and can no longer be awarded. Ask the builder to submit a fresh bid.");
        }

        // Award the bid
        bid.accept();
        bidRepository.save(bid);

        // Reject other active bids (SUBMITTED, SHORTLISTED, UNDER_REVIEW)
        List<BidStatus> activeStatuses = List.of(BidStatus.SUBMITTED, BidStatus.SHORTLISTED, BidStatus.UNDER_REVIEW);
        for (BidStatus status : activeStatuses) {
            List<Bid> otherBids = bidRepository.findByProjectIdAndStatus(projectId, status);
            for (Bid otherBid : otherBids) {
                if (!otherBid.getId().equals(bidId)) {
                    otherBid.reject("Another bid was selected");
                    bidRepository.save(otherBid);
                    notificationService.notifyBidRejected(otherBid);
                }
            }
        }

        // Award project
        User builder = bid.getBuilder();
        project.award(builder, bid.getAmount());
        project = projectRepository.save(project);

        // NOTE: no escrow account, contract, or milestone auto-generation here. Post-award, the BUILDER drafts the
        // contract (total locked to the accepted bid) and, once both parties sign, creates the
        // milestone schedule (capped at the awarded budget).

        // Send notifications
        notificationService.notifyProjectAwarded(project, builder);
        emailService.sendProjectAwardedEmail(builder, project.getTitle(), client.getName());

        auditService.logAction(client, "PROJECT_AWARDED", "PROJECT", projectId,
            "Awarded project to builder: " + builder.getName());

        return ProjectResponse.fromEntity(project);
    }

    /**
     * Client cancels a project before work starts: allowed while DRAFT/OPEN/BIDDING, or after
     * award as long as the contract is not signed by both parties. Every active bid is rejected
     * with its lead credit refunded, the awarded builder (if any) is notified, and an unsigned
     * contract is terminated.
     */
    @Transactional
    public ProjectResponse cancelProject(User client, Long projectId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("A cancellation reason is required");
        }

        Project project = projectRepository.findByIdForUpdate(projectId)
            .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You don't have access to this project");
        }
        SecurityUtils.validateNotSuspended(client);

        validateCancellable(project);

        rejectActiveBidsForCancellation(project);

        boolean awarded = project.getStatus() == ProjectStatus.AWARDED
            || project.getStatus() == ProjectStatus.CONTRACT_PENDING;
        if (awarded) {
            terminateUnsignedContract(project);
            rejectAwardedBidForCancellation(project);
            notifyAwardedBuilderOfCancellation(project, reason);
        }

        project.cancel(reason);
        project = projectRepository.save(project);

        auditService.logAction(client, "PROJECT_CANCELLED", "PROJECT", projectId,
            "Cancelled project: " + project.getTitle() + " — " + reason);

        return ProjectResponse.fromEntity(project);
    }

    private void validateCancellable(Project project) {
        ProjectStatus status = project.getStatus();
        boolean preAward = status == ProjectStatus.DRAFT
            || status == ProjectStatus.OPEN
            || status == ProjectStatus.BIDDING;
        if (preAward) {
            return;
        }

        boolean awarded = status == ProjectStatus.AWARDED || status == ProjectStatus.CONTRACT_PENDING;
        if (awarded) {
            boolean fullySigned = contractRepository.findByProjectId(project.getId())
                .map(Contract::isFullySigned)
                .orElse(false);
            if (!fullySigned) {
                return;
            }
            throw new BadRequestException(
                "The contract is already signed by both parties — this project can no longer be cancelled."
                + " File a dispute instead.");
        }

        throw new BadRequestException(
            "A project in status " + status + " can no longer be cancelled");
    }

    private void rejectActiveBidsForCancellation(Project project) {
        for (BidStatus status : ACTIVE_BID_STATUSES) {
            for (Bid bid : bidRepository.findByProjectIdAndStatus(project.getId(), status)) {
                bid.reject("Project was cancelled by the client");
                bidRepository.save(bid);
                notificationService.createNotification(bid.getBuilder(), NotificationType.BID_REJECTED,
                    "Project Cancelled",
                    "The project \"" + project.getTitle()
                        + "\" was cancelled by the client. Your lead credit has been refunded.",
                    "bid", bid.getId(), "/builder/bids");
                refundLeadCredit(bid);
            }
        }
    }

    /**
     * The awarded builder's bid sits in ACCEPTED (not one of the ACTIVE_BID_STATUSES), so
     * {@link #rejectActiveBidsForCancellation} skips it. On cancellation reject that bid too
     * and refund the lead credit the builder spent when bidding — otherwise the bid lingers as
     * ACCEPTED on a CANCELLED project and inflates the builder's accepted-count / win-rate.
     */
    private void rejectAwardedBidForCancellation(Project project) {
        for (Bid bid : bidRepository.findByProjectIdAndStatus(project.getId(), BidStatus.ACCEPTED)) {
            bid.reject("Project was cancelled by the client");
            bidRepository.save(bid);
            refundLeadCredit(bid);
        }
    }

    private void refundLeadCredit(Bid bid) {
        try {
            leadService.addLeadCredits(bid.getBuilder(), 1, LeadTransaction.TransactionType.REFUND,
                "Lead credit refunded for cancelled project: " + bid.getProject().getTitle());
        } catch (Exception e) {
            log.warn("Failed to refund lead credit for bid {}: {}", bid.getId(), e.getMessage());
        }
    }

    private void terminateUnsignedContract(Project project) {
        contractRepository.findByProjectId(project.getId())
            .filter(contract -> !contract.isFullySigned())
            .ifPresent(contract -> {
                contract.terminate();
                contractRepository.save(contract);
            });
    }

    private void notifyAwardedBuilderOfCancellation(Project project, String reason) {
        User builder = project.getAwardedBuilder();
        if (builder == null) {
            return;
        }
        notificationService.createNotification(builder, NotificationType.SYSTEM_ANNOUNCEMENT,
            "Project Cancelled",
            "The project \"" + project.getTitle() + "\" was cancelled by the client: " + reason
                + " Your lead credit has been refunded.",
            "project", project.getId(), "/builder/projects/" + project.getId());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategories() {
        return projectCategoryRepository.findAllByOrderByDisplayOrderAsc().stream()
            .map(c -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", c.getId());
                m.put("name", c.getName());
                m.put("slug", c.getSlug());
                m.put("icon", c.getIcon());
                return m;
            })
            .toList();
    }

    // Helper methods

    private Project getProjectForClient(User client, Long projectId) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You don't have access to this project");
        }

        return project;
    }

    private String generateProjectNumber() {
        String prefix = "PRJ-" + Year.now().getValue() + "-";
        Long nextNumber = projectRepository.getNextProjectNumber(prefix);
        return String.format("%s%05d", prefix, nextNumber);
    }

    private void createMilestones(Project project, List<ProjectCreateRequest.MilestoneRequest> milestoneRequests) {
        int order = 1;
        for (ProjectCreateRequest.MilestoneRequest request : milestoneRequests) {
            Milestone milestone = Milestone.builder()
                .project(project)
                .title(request.getTitle())
                .description(request.getDescription())
                .sequenceOrder(request.getSequenceOrder() != null ? request.getSequenceOrder() : order)
                .paymentAmount(request.getPaymentAmount())
                .paymentPercentage(request.getPaymentPercentage())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .deliverables(toJson(request.getDeliverables()))
                .status(MilestoneStatus.PENDING)
                .build();
            milestoneRepository.save(milestone);
            order++;
        }
    }

    /**
     * Resolve the built-up area in square feet. An explicit {@code areaSqFt} on the request wins;
     * otherwise the raw {@code areaValue} + {@code areaUnit} the wizard collected are converted
     * using local unit factors (MARLA=225, KANAL=4500, SQ_YARD=9, SQ_FT=1). Returns {@code null}
     * when neither an explicit value nor a value/unit pair is available.
     */
    private BigDecimal resolveAreaSqFt(ProjectCreateRequest request) {
        if (request.getAreaSqFt() != null) {
            return request.getAreaSqFt();
        }
        if (request.getAreaValue() == null || request.getAreaUnit() == null) {
            return null;
        }
        return request.getAreaValue().multiply(areaUnitFactor(request.getAreaUnit()));
    }

    private BigDecimal areaUnitFactor(String areaUnit) {
        if (areaUnit == null) {
            return BigDecimal.ONE;
        }
        switch (areaUnit.trim().toUpperCase()) {
            case "MARLA":   return new BigDecimal("225");
            case "KANAL":   return new BigDecimal("4500");
            case "SQ_YARD": return new BigDecimal("9");
            case "SQ_FT":   return BigDecimal.ONE;
            default:        return BigDecimal.ONE;
        }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to serialize to JSON", e);
            return null;
        }
    }
}
