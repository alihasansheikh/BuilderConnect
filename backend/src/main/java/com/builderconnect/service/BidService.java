package com.builderconnect.service;

import com.builderconnect.dto.request.BidCreateRequest;
import com.builderconnect.dto.response.BidResponse;
import com.builderconnect.entity.Bid;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.LeadTransaction;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.SubscriptionPlan;
import com.builderconnect.entity.User;
import com.builderconnect.enums.BidStatus;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.util.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.builderconnect.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;

/**
 * Service for bid operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BidService {

    private final BidRepository bidRepository;
    private final ProjectRepository projectRepository;
    private final BuilderProfileRepository builderProfileRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final LeadService leadService;
    // No bean cycle: SubscriptionService depends only on plan/profile repos + AuditService
    private final SubscriptionService subscriptionService;
    private final SystemSettingService systemSettingService;
    private final ObjectMapper objectMapper;

    private static final BigDecimal FALLBACK_MIN_BID = new BigDecimal("1000");
    private static final BigDecimal FALLBACK_MAX_BID = new BigDecimal("50000000");
    private static final int FALLBACK_BID_VALIDITY_DAYS = 30;

    @Transactional
    public BidResponse createBid(User builder, BidCreateRequest request) {
        SecurityUtils.validateNotSuspended(builder);
        // Validate project exists and is open for bidding
        Project project = projectRepository.findByIdAndDeletedFalse(request.getProjectId())
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        validateProjectAcceptsBids(project, builder);

        validateBidAmountWithinLimits(request.getAmount());

        enforceActiveBidLimit(builder);

        // Re-bidding after a withdrawal reuses the withdrawn row (project+builder is unique in
        // the schema); otherwise a fresh bid is created.
        Bid bid = bidRepository.findByProjectIdAndBuilderId(request.getProjectId(), builder.getId())
            .map(withdrawn -> refreshWithdrawnBid(withdrawn, request))
            .orElseGet(() -> newBidFromRequest(project, builder, request));

        // Verify builder has lead credits before creating the bid
        leadService.verifyLeadCredits(builder);

        // Submit the bid immediately
        bid.submit();
        bid = bidRepository.save(bid);

        // Consume a lead credit now that the bid is saved (referenceId available)
        leadService.consumeLeadCredit(builder, bid.getId(), project.getTitle());

        // Update project status to BIDDING if it was OPEN
        if (project.getStatus() == ProjectStatus.OPEN) {
            project.setStatus(ProjectStatus.BIDDING);
            projectRepository.save(project);
        }

        // Send notification to client
        notificationService.notifyNewBid(project, bid);
        emailService.sendNewBidEmail(project.getClient(), project.getId(), project.getTitle(),
            builder.getName(), String.format("%,.2f", bid.getAmount()),
            String.valueOf(bid.getEstimatedDurationDays()));

        auditService.logAction(builder, "BID_CREATED", "BID", bid.getId(),
            "Created bid for project: " + project.getTitle());

        return BidResponse.fromEntity(bid);
    }

    /**
     * Bid creation preconditions: project accepts bids (status + deadline, split messages),
     * verified-builders-only gate, and no existing non-withdrawn bid from this builder.
     */
    private void validateProjectAcceptsBids(Project project, User builder) {
        // A deleted client can never award — don't let builders spend lead credits here.
        if (Boolean.TRUE.equals(project.getClient().getDeleted())) {
            throw new BadRequestException("This project is no longer accepting bids");
        }

        if (!project.canReceiveBids()) {
            if (!project.isOpen()) {
                throw new BadRequestException("Bidding is closed for this project");
            }
            throw new BadRequestException("The bidding deadline has passed");
        }

        if (Boolean.TRUE.equals(project.getVerifiedBuildersOnly())) {
            boolean verified = builderProfileRepository.findByUserId(builder.getId())
                .map(profile -> Boolean.TRUE.equals(profile.getIsVerified()))
                .orElse(false);
            if (!verified) {
                throw new BadRequestException("This project only accepts bids from verified builders");
            }
        }

        // A WITHDRAWN bid does not block re-bidding (the lead credit was refunded on withdrawal)
        if (bidRepository.existsByProjectIdAndBuilderIdAndStatusNot(
                project.getId(), builder.getId(), BidStatus.WITHDRAWN)) {
            throw new BadRequestException("You have already submitted a bid for this project");
        }
    }

    /**
     * Subscription plan limit: the number of concurrently active bids is capped by the
     * builder's EFFECTIVE tier (expired paid tier counts as FREE). "Active" mirrors
     * {@link BidStatus#isActive()} — SUBMITTED / UNDER_REVIEW / SHORTLISTED; accepted,
     * rejected, withdrawn and expired bids don't count against the cap.
     */
    private void enforceActiveBidLimit(User builder) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));
        SubscriptionPlan effectivePlan = subscriptionService.getEffectivePlan(profile);

        long activeBids = bidRepository.countByBuilderIdAndStatusIn(builder.getId(),
            List.of(BidStatus.SUBMITTED, BidStatus.UNDER_REVIEW, BidStatus.SHORTLISTED));

        if (activeBids >= effectivePlan.getMaxActiveBids()) {
            throw new BadRequestException("You've reached your " + profile.getEffectiveTier()
                + " plan limit of " + effectivePlan.getMaxActiveBids()
                + " active bids. Upgrade your subscription to bid on more projects.");
        }
    }

    /**
     * Admin-configurable bid amount bounds (the DTO's @DecimalMin 1000 remains the
     * absolute floor even if the setting is lowered).
     */
    private void validateBidAmountWithinLimits(BigDecimal amount) {
        BigDecimal minBid = systemSettingService.getDecimal(
            SystemSettingService.KEY_MIN_BID_AMOUNT, FALLBACK_MIN_BID);
        BigDecimal maxBid = systemSettingService.getDecimal(
            SystemSettingService.KEY_MAX_BID_AMOUNT, FALLBACK_MAX_BID);
        if (amount.compareTo(minBid) < 0 || amount.compareTo(maxBid) > 0) {
            throw new BadRequestException(String.format(
                "Bid amount must be between PKR %,.0f and PKR %,.0f", minBid, maxBid));
        }
    }

    private LocalDate resolveValidUntil(BidCreateRequest request) {
        if (request.getValidUntil() != null) {
            return request.getValidUntil();
        }
        int validityDays = systemSettingService.getInt(
            SystemSettingService.KEY_BID_VALIDITY_DAYS, FALLBACK_BID_VALIDITY_DAYS);
        return LocalDate.now().plusDays(validityDays);
    }

    private Bid newBidFromRequest(Project project, User builder, BidCreateRequest request) {
        return Bid.builder()
            .bidNumber(generateBidNumber())
            .project(project)
            .builder(builder)
            .amount(request.getAmount())
            .proposal(request.getProposal())
            .workPlan(request.getWorkPlan())
            .estimatedDurationDays(request.getEstimatedDurationDays())
            .laborCost(request.getLaborCost())
            .materialCost(request.getMaterialCost())
            .otherCost(request.getOtherCost())
            .costBreakdown(request.getCostBreakdownJson())
            .attachments(toJson(request.getAttachmentUrls()))
            .validUntil(resolveValidUntil(request))
            .status(BidStatus.DRAFT)
            .build();
    }

    /**
     * Re-bid after withdrawal: the schema enforces one bid row per project+builder, so the
     * withdrawn row is refreshed in place with the new proposal before being resubmitted.
     */
    private Bid refreshWithdrawnBid(Bid bid, BidCreateRequest request) {
        bid.setAmount(request.getAmount());
        bid.setProposal(request.getProposal());
        bid.setWorkPlan(request.getWorkPlan());
        bid.setEstimatedDurationDays(request.getEstimatedDurationDays());
        bid.setLaborCost(request.getLaborCost());
        bid.setMaterialCost(request.getMaterialCost());
        bid.setOtherCost(request.getOtherCost());
        bid.setCostBreakdown(request.getCostBreakdownJson());
        bid.setAttachments(toJson(request.getAttachmentUrls()));
        bid.setValidUntil(resolveValidUntil(request));
        bid.setWithdrawnAt(null);
        bid.setRejectionReason(null);
        bid.setClientNotes(null);
        return bid;
    }

    @Transactional(readOnly = true)
    public BidResponse getBid(Long bidId, User requester) {
        Bid bid = bidRepository.findById(bidId)
            .orElseThrow(() -> new ResourceNotFoundException("Bid not found"));

        boolean isBidOwner = bid.getBuilder().getId().equals(requester.getId());
        boolean isProjectClient = bid.getProject().getClient().getId().equals(requester.getId());
        if (!isBidOwner && !isProjectClient && !requester.isAdmin()) {
            throw new UnauthorizedException("You don't have permission to view this bid");
        }

        return BidResponse.fromEntity(bid);
    }

    @Transactional(readOnly = true)
    public Page<BidResponse> getBuilderBids(User builder, BidStatus status, Pageable pageable) {
        Page<Bid> bids;
        if (status != null) {
            bids = bidRepository.findByBuilderIdAndStatus(builder.getId(), status, pageable);
        } else {
            bids = bidRepository.findByBuilderId(builder.getId(), pageable);
        }
        return bids.map(BidResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<BidResponse> getProjectBids(Long projectId, User requester, Pageable pageable) {
        validateProjectBidsAccess(projectId, requester);
        Page<Bid> bids = bidRepository.findByProjectId(projectId, pageable);
        // Full DTO, not the summary: access is already restricted to the project's client and
        // admins, who need the proposal/work plan/cost breakdown to evaluate the bid.
        return bids.map(BidResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<BidResponse> getProjectBidsList(Long projectId, User requester) {
        validateProjectBidsAccess(projectId, requester);
        List<Bid> bids = bidRepository.findByProjectId(projectId);
        return bids.stream().map(BidResponse::fromEntity).toList();
    }

    /** The full bid list of a project is visible only to its client and platform admins. */
    private void validateProjectBidsAccess(Long projectId, User requester) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        boolean isProjectClient = project.getClient().getId().equals(requester.getId());
        if (!isProjectClient && !requester.isAdmin()) {
            throw new UnauthorizedException("You don't have permission to view bids for this project");
        }
    }

    /** Aggregate bid counts for the builder's dashboard, keyed exactly as the frontend expects. */
    public record BidStats(long total, long submitted, long shortlisted, long accepted,
                           long rejected, long withdrawn) {
    }

    @Transactional(readOnly = true)
    public BidStats getBuilderBidStats(User builder) {
        Long builderId = builder.getId();
        return new BidStats(
            bidRepository.countByBuilderId(builderId),
            bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.SUBMITTED),
            bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.SHORTLISTED),
            bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.ACCEPTED),
            bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.REJECTED),
            bidRepository.countByBuilderIdAndStatus(builderId, BidStatus.WITHDRAWN));
    }

    @Transactional(readOnly = true)
    public boolean bidExists(Long projectId, User builder) {
        return bidRepository.existsByProjectIdAndBuilderIdAndStatusNot(
            projectId, builder.getId(), BidStatus.WITHDRAWN);
    }

    @Transactional
    public BidResponse withdrawBid(User builder, Long bidId) {
        Bid bid = bidRepository.findById(bidId)
            .orElseThrow(() -> new ResourceNotFoundException("Bid not found"));

        // Verify ownership
        if (!bid.getBuilder().getId().equals(builder.getId())) {
            throw new UnauthorizedException("You don't have permission to withdraw this bid");
        }

        if (bid.getStatus() == BidStatus.ACCEPTED) {
            throw new BadRequestException("Cannot withdraw an accepted bid");
        }

        // Check if bid can be withdrawn
        if (!bid.isActive()) {
            throw new BadRequestException("This bid cannot be withdrawn");
        }

        bid.withdraw();
        bid = bidRepository.save(bid);

        // Refund lead credit
        try {
            leadService.addLeadCredits(builder, 1, LeadTransaction.TransactionType.REFUND,
                "Lead credit refunded for withdrawn bid on project: " + bid.getProject().getTitle());
        } catch (Exception e) {
            log.warn("Failed to refund lead credit for bid {}: {}", bidId, e.getMessage());
        }

        auditService.logAction(builder, "BID_WITHDRAWN", "BID", bidId,
            "Withdrew bid for project: " + bid.getProject().getTitle());

        return BidResponse.fromEntity(bid);
    }

    @Transactional
    public BidResponse shortlistBid(User client, Long bidId) {
        Bid bid = bidRepository.findById(bidId)
            .orElseThrow(() -> new ResourceNotFoundException("Bid not found"));

        // Verify project ownership
        if (!bid.getProject().getClient().getId().equals(client.getId())) {
            throw new UnauthorizedException("You don't have permission to shortlist this bid");
        }
        SecurityUtils.validateNotSuspended(client);

        if (bid.getStatus() != BidStatus.SUBMITTED) {
            throw new BadRequestException("Only submitted bids can be shortlisted");
        }

        bid.shortlist();
        bid = bidRepository.save(bid);

        // Notify builder
        notificationService.notifyBidShortlisted(bid);

        auditService.logAction(client, "BID_SHORTLISTED", "BID", bidId,
            "Shortlisted bid from: " + bid.getBuilder().getName());

        return BidResponse.fromEntity(bid);
    }

    /**
     * Daily sweep: any still-active bid whose validity window has passed becomes EXPIRED and
     * its builder is told. Runs at 03:00 server time.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void expireStaleBids() {
        List<Bid> staleBids = bidRepository.findByStatusInAndValidUntilBefore(
            List.of(BidStatus.SUBMITTED, BidStatus.SHORTLISTED), LocalDate.now());

        for (Bid bid : staleBids) {
            bid.expire();
            bidRepository.save(bid);
            notificationService.createNotification(bid.getBuilder(), NotificationType.SYSTEM_ANNOUNCEMENT,
                "Bid Expired",
                "Your bid for \"" + bid.getProject().getTitle() + "\" expired on "
                    + bid.getValidUntil() + ". Submit a fresh bid if you are still interested.",
                "bid", bid.getId(), "/builder/bids");
        }

        if (!staleBids.isEmpty()) {
            log.info("Bid expiry sweep marked {} bids EXPIRED", staleBids.size());
        }
    }

    // Helper methods

    private String generateBidNumber() {
        String prefix = "BID-" + Year.now().getValue() + "-";
        Long nextNumber = bidRepository.getNextBidNumber(prefix);
        return String.format("%s%05d", prefix, nextNumber);
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
