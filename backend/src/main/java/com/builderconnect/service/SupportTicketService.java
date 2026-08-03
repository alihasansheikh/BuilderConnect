package com.builderconnect.service;

import com.builderconnect.dto.request.SupportTicketCreateRequest;
import com.builderconnect.dto.request.TicketResponseRequest;
import com.builderconnect.dto.response.SupportTicketResponse;
import com.builderconnect.dto.response.TicketResponseResponse;
import com.builderconnect.entity.SupportTicket;
import com.builderconnect.entity.SupportTicket.TicketCategory;
import com.builderconnect.entity.SupportTicket.TicketPriority;
import com.builderconnect.entity.SupportTicket.TicketStatus;
import com.builderconnect.entity.TicketResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.SupportTicketRepository;
import com.builderconnect.repository.TicketResponseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.time.Year;
import java.util.List;
import java.util.UUID;

/**
 * Service for support ticket management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupportTicketService {

    private final SupportTicketRepository supportTicketRepository;
    private final TicketResponseRepository ticketResponseRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * Create a new support ticket.
     */
    @Transactional
    public SupportTicketResponse createTicket(User user, SupportTicketCreateRequest request) {
        TicketCategory category;
        try {
            category = TicketCategory.valueOf(request.getCategory());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid category: " + request.getCategory());
        }

        TicketPriority priority = TicketPriority.NORMAL;
        if (request.getPriority() != null) {
            try {
                priority = TicketPriority.valueOf(request.getPriority());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid priority: " + request.getPriority());
            }
        }

        SupportTicket ticket = SupportTicket.builder()
                .ticketNumber("TMP-" + UUID.randomUUID().toString().substring(0, 13))
                .user(user)
                .category(category)
                .priority(priority)
                .subject(request.getSubject())
                .description(request.getDescription())
                .projectId(request.getProjectId())
                .orderId(request.getOrderId())
                .build();

        ticket = supportTicketRepository.save(ticket);
        // PK-derived number — race-free (unlike the old findMaxId()+1 pattern)
        ticket.setTicketNumber(String.format("TKT-%d-%05d", Year.now().getValue(), ticket.getId()));

        auditService.logAction(user, "SUPPORT_TICKET_CREATED", "SUPPORT_TICKET", ticket.getId(),
                "Created support ticket: " + ticket.getTicketNumber() + " - " + request.getSubject());

        notificationService.notifySupportAgents(NotificationType.TICKET_CREATED,
                "New Support Ticket",
                String.format("Ticket %s (%s) opened by %s: %s",
                        ticket.getTicketNumber(), category.name(),
                        HtmlUtils.htmlEscape(user.getName()),
                        HtmlUtils.htmlEscape(request.getSubject())),
                "support_ticket", ticket.getId(), "/support/tickets/" + ticket.getId());

        log.info("Support ticket {} created by user {}", ticket.getTicketNumber(), user.getId());

        return SupportTicketResponse.fromEntity(ticket, 0);
    }

    /**
     * Get a single ticket by ID.
     */
    @Transactional(readOnly = true)
    public SupportTicketResponse getTicket(User user, Long ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        // Non-admin/support users can only see their own tickets
        if (!isSupportOrAdmin(user) && !ticket.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not have permission to view this ticket");
        }

        long responseCount = ticketResponseRepository.countByTicketId(ticketId);
        return SupportTicketResponse.fromEntity(ticket, responseCount);
    }

    /**
     * Get tickets for the current user, optionally filtered by status.
     */
    @Transactional(readOnly = true)
    public Page<SupportTicketResponse> getUserTickets(User user, String status, Pageable pageable) {
        TicketStatus ticketStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                ticketStatus = TicketStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }

        Page<SupportTicket> tickets = ticketStatus != null
                ? supportTicketRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), ticketStatus, pageable)
                : supportTicketRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);

        return tickets.map(ticket -> {
            long responseCount = ticketResponseRepository.countByTicketId(ticket.getId());
            return SupportTicketResponse.fromEntity(ticket, responseCount);
        });
    }

    /**
     * Get all tickets with optional filters (SUPPORT_AGENT/ADMIN only).
     */
    @Transactional(readOnly = true)
    public Page<SupportTicketResponse> getAllTickets(String status, String category, String priority,
                                                     Boolean escalated, Pageable pageable) {
        TicketStatus ticketStatus = null;
        TicketCategory ticketCategory = null;
        TicketPriority ticketPriority = null;

        if (status != null && !status.isEmpty()) {
            try {
                ticketStatus = TicketStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }
        if (category != null && !category.isEmpty()) {
            try {
                ticketCategory = TicketCategory.valueOf(category);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid category: " + category);
            }
        }
        if (priority != null && !priority.isEmpty()) {
            try {
                ticketPriority = TicketPriority.valueOf(priority);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid priority: " + priority);
            }
        }

        return supportTicketRepository.findAllWithFilters(
                        ticketStatus, ticketCategory, ticketPriority, escalated, pageable)
                .map(ticket -> {
                    long responseCount = ticketResponseRepository.countByTicketId(ticket.getId());
                    return SupportTicketResponse.fromEntity(ticket, responseCount);
                });
    }

    /**
     * Escalate a ticket to admins. Agents work tickets day-to-day; escalation
     * hands one up to admin oversight and flags it so it surfaces on their queue.
     */
    @Transactional
    public SupportTicketResponse escalateTicket(User user, Long ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        if (ticket.isEscalated()) {
            throw new BadRequestException("Ticket is already escalated");
        }

        ticket.escalate();
        ticket = supportTicketRepository.save(ticket);

        auditService.logAction(user, "SUPPORT_TICKET_ESCALATED", "SUPPORT_TICKET", ticket.getId(),
                "Escalated ticket " + ticket.getTicketNumber() + " to admins");

        notificationService.notifyAdmins(NotificationType.TICKET_UPDATED,
                "Ticket Escalated",
                String.format("Ticket %s (\"%s\") was escalated by %s and needs admin attention.",
                        ticket.getTicketNumber(), HtmlUtils.htmlEscape(ticket.getSubject()),
                        HtmlUtils.htmlEscape(user.getName())),
                "support_ticket", ticket.getId(), "/support/tickets/" + ticket.getId());

        log.info("Support ticket {} escalated by user {}", ticket.getTicketNumber(), user.getId());

        long responseCount = ticketResponseRepository.countByTicketId(ticketId);
        return SupportTicketResponse.fromEntity(ticket, responseCount);
    }

    /**
     * Update ticket status.
     */
    @Transactional
    public SupportTicketResponse updateStatus(User user, Long ticketId, String newStatus) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        TicketStatus status;
        try {
            status = TicketStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + newStatus);
        }

        String oldStatus = ticket.getStatus().name();
        ticket.updateStatus(status);
        ticket = supportTicketRepository.save(ticket);

        auditService.logAction(user, "SUPPORT_TICKET_STATUS_UPDATED", "SUPPORT_TICKET", ticket.getId(),
                "Updated ticket " + ticket.getTicketNumber() + " status from " + oldStatus + " to " + newStatus);

        log.info("Support ticket {} status updated from {} to {} by user {}",
                ticket.getTicketNumber(), oldStatus, newStatus, user.getId());

        long responseCount = ticketResponseRepository.countByTicketId(ticketId);
        return SupportTicketResponse.fromEntity(ticket, responseCount);
    }

    /**
     * Resolve a ticket.
     */
    @Transactional
    public SupportTicketResponse resolveTicket(User user, Long ticketId, String resolution) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        if (ticket.isResolved()) {
            throw new BadRequestException("Ticket is already resolved");
        }

        ticket.resolve(user.getId(), resolution);
        ticket = supportTicketRepository.save(ticket);

        auditService.logAction(user, "SUPPORT_TICKET_RESOLVED", "SUPPORT_TICKET", ticket.getId(),
                "Resolved ticket " + ticket.getTicketNumber());

        if (!ticket.getUser().getId().equals(user.getId())) {
            User owner = ticket.getUser();
            notificationService.createNotification(owner, NotificationType.TICKET_UPDATED,
                    "Ticket Resolved",
                    String.format("Your ticket %s (\"%s\") has been resolved.",
                            ticket.getTicketNumber(), HtmlUtils.htmlEscape(ticket.getSubject())),
                    "support_ticket", ticket.getId(), ticketUrlFor(owner, ticket.getId()));
            emailService.sendTicketResolvedEmail(owner, ticket.getTicketNumber(),
                    ticket.getSubject(), ticket.getResolution());
        }

        log.info("Support ticket {} resolved by user {}", ticket.getTicketNumber(), user.getId());

        long responseCount = ticketResponseRepository.countByTicketId(ticketId);
        return SupportTicketResponse.fromEntity(ticket, responseCount);
    }

    /**
     * Reopen a resolved ticket (by the ticket owner).
     */
    @Transactional
    public SupportTicketResponse reopenTicket(User user, Long ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        // Only ticket owner or support/admin can reopen
        if (!ticket.getUser().getId().equals(user.getId()) && !isSupportOrAdmin(user)) {
            throw new UnauthorizedException("You do not have permission to reopen this ticket");
        }

        if (!ticket.isResolved()) {
            throw new BadRequestException("Only resolved or closed tickets can be reopened");
        }

        ticket.reopen();
        ticket = supportTicketRepository.save(ticket);

        auditService.logAction(user, "SUPPORT_TICKET_REOPENED", "SUPPORT_TICKET", ticket.getId(),
                "Reopened ticket " + ticket.getTicketNumber());

        notificationService.notifySupportAgents(NotificationType.TICKET_UPDATED,
                "Ticket Reopened",
                String.format("Ticket %s (\"%s\") was reopened by %s.",
                        ticket.getTicketNumber(), HtmlUtils.htmlEscape(ticket.getSubject()),
                        HtmlUtils.htmlEscape(user.getName())),
                "support_ticket", ticket.getId(), "/support/tickets/" + ticket.getId());

        log.info("Support ticket {} reopened by user {}", ticket.getTicketNumber(), user.getId());

        long responseCount = ticketResponseRepository.countByTicketId(ticketId);
        return SupportTicketResponse.fromEntity(ticket, responseCount);
    }

    /**
     * Add a response to a ticket.
     */
    @Transactional
    public TicketResponseResponse addResponse(User user, Long ticketId, TicketResponseRequest request) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        // Ticket owner or support/admin can respond
        if (!ticket.getUser().getId().equals(user.getId()) && !isSupportOrAdmin(user)) {
            throw new UnauthorizedException("You do not have permission to respond to this ticket");
        }

        // Only support/admin can post internal notes
        boolean isInternal = Boolean.TRUE.equals(request.getIsInternal()) && isSupportOrAdmin(user);

        TicketResponse response = TicketResponse.builder()
                .ticket(ticket)
                .user(user)
                .message(request.getMessage())
                .isInternal(isInternal)
                .build();

        response = ticketResponseRepository.save(response);

        boolean ownerResponded = ticket.getUser().getId().equals(user.getId());
        if (!ownerResponded && isSupportOrAdmin(user)) {
            // First support response marks the ticket as being worked; later ones wait on the customer
            if (ticket.getStatus() == TicketStatus.OPEN) {
                ticket.updateStatus(TicketStatus.IN_PROGRESS);
                supportTicketRepository.save(ticket);
            } else if (ticket.getStatus() != TicketStatus.RESOLVED) {
                ticket.updateStatus(TicketStatus.WAITING_CUSTOMER);
                supportTicketRepository.save(ticket);
            }
            if (!isInternal) {
                User owner = ticket.getUser();
                notificationService.createNotification(owner, NotificationType.TICKET_UPDATED,
                        "Support Replied",
                        String.format("Our team replied to your ticket %s (\"%s\").",
                                ticket.getTicketNumber(), HtmlUtils.htmlEscape(ticket.getSubject())),
                        "support_ticket", ticket.getId(), ticketUrlFor(owner, ticket.getId()));
                emailService.sendTicketResponseEmail(owner, ticket.getTicketNumber(), ticket.getSubject());
            }
        } else if (ownerResponded) {
            if (ticket.getStatus() == TicketStatus.WAITING_CUSTOMER || ticket.getStatus() == TicketStatus.RESOLVED) {
                ticket.updateStatus(TicketStatus.WAITING_INTERNAL);
                supportTicketRepository.save(ticket);
            }
            notificationService.notifySupportAgents(NotificationType.TICKET_UPDATED,
                    "Customer Replied",
                    String.format("%s replied to ticket %s (\"%s\").",
                            HtmlUtils.htmlEscape(user.getName()), ticket.getTicketNumber(),
                            HtmlUtils.htmlEscape(ticket.getSubject())),
                    "support_ticket", ticket.getId(), "/support/tickets/" + ticket.getId());
        }

        log.info("Response added to ticket {} by user {}", ticket.getTicketNumber(), user.getId());

        return TicketResponseResponse.fromEntity(response);
    }

    /**
     * Get all responses for a ticket.
     */
    @Transactional(readOnly = true)
    public List<TicketResponseResponse> getResponses(User user, Long ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));

        // Non-admin/support users can only see their own tickets' responses
        if (!isSupportOrAdmin(user) && !ticket.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not have permission to view responses for this ticket");
        }

        List<TicketResponse> responses = ticketResponseRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);

        // Filter out internal notes for non-support/admin users
        if (!isSupportOrAdmin(user)) {
            responses = responses.stream()
                    .filter(r -> !Boolean.TRUE.equals(r.getIsInternal()))
                    .toList();
        }

        return responses.stream()
                .map(TicketResponseResponse::fromEntity)
                .toList();
    }

    /** Role-scoped link to the ticket: support/admin get the agent view, owners their help page. */
    private String ticketUrlFor(User user, Long ticketId) {
        if (isSupportOrAdmin(user)) {
            return "/support/tickets/" + ticketId;
        }
        return "/" + roleSegment(user) + "/support/tickets/" + ticketId;
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
}
