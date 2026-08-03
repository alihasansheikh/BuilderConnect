package com.builderconnect.service;

import com.builderconnect.entity.*;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.NotificationRepository;
import com.builderconnect.repository.UserRepository;
import org.springframework.web.util.HtmlUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;

/**
 * Service for managing notifications.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @Transactional
    public Notification createNotification(User user, NotificationType type,
                                            String title, String message,
                                            String entityType, Long entityId,
                                            String actionUrl) {
        Notification notification = Notification.builder()
            .user(user)
            .notificationType(type)
            .title(title)
            .message(message)
            .relatedEntityType(entityType)
            .relatedEntityId(entityId)
            .actionUrl(actionUrl)
            .build();

        Notification saved = notificationRepository.save(notification);

        // Capture values for broadcast (may execute outside Hibernate session)
        String userEmail = user.getEmail();
        Long userId = user.getId();
        Long notifId = saved.getId();
        String typeName = type.name();
        String safeEntityType = entityType != null ? entityType : "";
        Object safeEntityId = entityId != null ? entityId : 0;
        String safeActionUrl = actionUrl != null ? actionUrl : "";
        String createdAtIso = saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : "";

        // Defer WebSocket broadcast until after transaction commits
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    broadcastNotification(userEmail, userId, notifId, typeName, title, message,
                            safeEntityType, safeEntityId, safeActionUrl, createdAtIso);
                }
            });
        } else {
            // No active transaction — broadcast immediately
            broadcastNotification(userEmail, userId, notifId, typeName, title, message,
                    safeEntityType, safeEntityId, safeActionUrl, createdAtIso);
        }

        return saved;
    }

    private void broadcastNotification(String userEmail, Long userId, Long notifId,
                                        String typeName, String title, String message,
                                        String entityType, Object entityId,
                                        String actionUrl, String createdAt) {
        try {
            messagingTemplate.convertAndSendToUser(
                userEmail,
                "/queue/notifications",
                Map.of(
                    "id", notifId,
                    "type", typeName,
                    "title", title,
                    "message", message,
                    "entityType", entityType,
                    "entityId", entityId,
                    "actionUrl", actionUrl,
                    "createdAt", createdAt
                )
            );
        } catch (Exception e) {
            log.warn("Failed to broadcast notification via WebSocket for user {}: {}",
                     userId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<Notification> getUserNotifications(Long userId, Boolean isRead, Pageable pageable) {
        if (Boolean.FALSE.equals(isRead)) {
            return notificationRepository.findByUserIdAndIsReadFalse(userId, pageable);
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        int updated = notificationRepository.markAsRead(notificationId, userId);
        if (updated == 0) {
            // Not found OR owned by another user — do not reveal which
            throw new ResourceNotFoundException("Notification not found: " + notificationId);
        }
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    /** Fan out one notification to every ADMIN and SUPER_ADMIN. */
    @Transactional
    public void notifyAdmins(NotificationType type, String title, String message,
                             String entityType, Long entityId, String actionUrl) {
        notifyRoles(List.of(UserRole.ADMIN, UserRole.SUPER_ADMIN),
            type, title, message, entityType, entityId, actionUrl);
    }

    /**
     * Fan out one notification to every SUPPORT_AGENT. When no active agents
     * exist, falls back to notifyAdmins so support events are never silent.
     */
    @Transactional
    public void notifySupportAgents(NotificationType type, String title, String message,
                                    String entityType, Long entityId, String actionUrl) {
        List<User> agents = userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
            List.of(UserRole.SUPPORT_AGENT));
        if (agents.isEmpty()) {
            notifyAdmins(type, title, message, entityType, entityId, actionUrl);
            return;
        }
        for (User recipient : agents) {
            createNotification(recipient, type, title, message, entityType, entityId, actionUrl);
        }
    }

    private void notifyRoles(List<UserRole> roles, NotificationType type, String title,
                             String message, String entityType, Long entityId, String actionUrl) {
        for (User recipient : userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(roles)) {
            createNotification(recipient, type, title, message, entityType, entityId, actionUrl);
        }
    }

    // Notification creators for specific events

    public void notifyNewBid(Project project, Bid bid) {
        createNotification(
            project.getClient(),
            NotificationType.NEW_BID,
            "New Bid Received",
            String.format("You received a new bid of PKR %,.0f for your project \"%s\"",
                bid.getAmount(), HtmlUtils.htmlEscape(project.getTitle())),
            "bid",
            bid.getId(),
            "/client/projects/" + project.getId()
        );
    }

    public void notifyBidRejected(Bid bid) {
        createNotification(
            bid.getBuilder(),
            NotificationType.BID_REJECTED,
            "Bid Not Selected",
            String.format("Your bid for \"%s\" was not selected.", HtmlUtils.htmlEscape(bid.getProject().getTitle())),
            "bid",
            bid.getId(),
            "/builder/bids"
        );
    }

    public void notifyBidShortlisted(Bid bid) {
        createNotification(
            bid.getBuilder(),
            NotificationType.BID_SHORTLISTED,
            "Bid Shortlisted!",
            String.format("Your bid for \"%s\" has been shortlisted by the client!", HtmlUtils.htmlEscape(bid.getProject().getTitle())),
            "bid",
            bid.getId(),
            "/builder/bids"
        );
    }

    public void notifyProjectAwarded(Project project, User builder) {
        createNotification(
            builder,
            NotificationType.PROJECT_AWARDED,
            "Project Awarded!",
            String.format("Congratulations! You've been awarded the project \"%s\". Next: review and sign the contract.",
                HtmlUtils.htmlEscape(project.getTitle())),
            "project",
            project.getId(),
            "/builder/projects/" + project.getId() + "?tab=contract"
        );
    }

    public void notifyMilestoneCompleted(Project project, Milestone milestone) {
        createNotification(
            project.getClient(),
            NotificationType.MILESTONE_COMPLETED,
            "Milestone Completed",
            String.format("Milestone \"%s\" for project \"%s\" has been marked complete. Please review.",
                HtmlUtils.htmlEscape(milestone.getTitle()), HtmlUtils.htmlEscape(project.getTitle())),
            "milestone",
            milestone.getId(),
            "/client/projects/" + project.getId()
        );
    }

    public void notifyMilestoneApproved(Project project, Milestone milestone) {
        createNotification(
            project.getAwardedBuilder(),
            NotificationType.MILESTONE_APPROVED,
            "Milestone Approved",
            String.format("Milestone \"%s\" for project \"%s\" has been approved.",
                HtmlUtils.htmlEscape(milestone.getTitle()), HtmlUtils.htmlEscape(project.getTitle())),
            "milestone",
            milestone.getId(),
            "/builder/projects/" + project.getId()
        );
    }

    public void notifyNewReview(User reviewee, Review review) {
        createNotification(
            reviewee,
            NotificationType.NEW_REVIEW,
            "New Review",
            String.format("You received a %d-star review from %s",
                review.getOverallRating(), HtmlUtils.htmlEscape(review.getReviewer().getName())),
            "review",
            review.getId(),
            "/builder/reviews"
        );
    }

    // Material order / product marketplace notifications

    public void notifyOrderPlaced(MaterialOrder order) {
        createNotification(
            order.getSupplier(),
            NotificationType.ORDER_PLACED,
            "New Order Received",
            String.format("New order %s worth PKR %,.0f placed by %s.",
                order.getOrderNumber(), order.getTotalAmount(),
                HtmlUtils.htmlEscape(order.getOrderedBy().getName())),
            "material_order",
            order.getId(),
            "/supplier/orders/" + order.getId()
        );
    }

    public void notifyOrderConfirmed(MaterialOrder order) {
        createNotification(
            order.getOrderedBy(),
            NotificationType.ORDER_CONFIRMED,
            "Order Confirmed",
            String.format("Your order %s has been confirmed by %s.",
                order.getOrderNumber(), HtmlUtils.htmlEscape(order.getSupplier().getName())),
            "material_order",
            order.getId(),
            buyerOrderUrl(order)
        );
    }

    public void notifyOrderStatusChanged(MaterialOrder order, String oldStatus) {
        createNotification(
            order.getOrderedBy(),
            NotificationType.ORDER_STATUS_UPDATED,
            "Order Status Updated",
            String.format("Your order %s moved from %s to %s.",
                order.getOrderNumber(), oldStatus, order.getStatus().name()),
            "material_order",
            order.getId(),
            buyerOrderUrl(order)
        );
    }

    public void notifyOrderDelivered(MaterialOrder order) {
        createNotification(
            order.getOrderedBy(),
            NotificationType.ORDER_DELIVERED,
            "Order Delivered",
            String.format("Your order %s from %s has been delivered.",
                order.getOrderNumber(), HtmlUtils.htmlEscape(order.getSupplier().getName())),
            "material_order",
            order.getId(),
            buyerOrderUrl(order)
        );
    }

    public void notifyOrderCancelled(MaterialOrder order, User actor) {
        boolean cancelledByBuyer = actor.getId().equals(order.getOrderedBy().getId());
        User recipient = cancelledByBuyer ? order.getSupplier() : order.getOrderedBy();
        createNotification(
            recipient,
            NotificationType.ORDER_CANCELLED,
            "Order Cancelled",
            String.format("Order %s has been cancelled by %s.",
                order.getOrderNumber(), HtmlUtils.htmlEscape(actor.getName())),
            "material_order",
            order.getId(),
            cancelledByBuyer ? "/supplier/orders/" + order.getId() : buyerOrderUrl(order)
        );
    }

    public void notifyOrderPaymentReceived(MaterialOrder order) {
        createNotification(
            order.getOrderedBy(),
            NotificationType.PAYMENT_RECEIVED,
            "Payment Received",
            String.format("%s confirmed receiving your payment of PKR %,.0f for order %s.",
                HtmlUtils.htmlEscape(order.getSupplier().getName()),
                order.getTotalAmount(), order.getOrderNumber()),
            "material_order",
            order.getId(),
            buyerOrderUrl(order)
        );
    }

    public void notifyProductReview(Material material, Review review) {
        createNotification(
            material.getSupplier(),
            NotificationType.PRODUCT_REVIEW,
            "New Product Review",
            String.format("%s left a %d-star review on \"%s\".",
                HtmlUtils.htmlEscape(review.getReviewer().getName()),
                review.getOverallRating(), HtmlUtils.htmlEscape(material.getName())),
            "review",
            review.getId(),
            "/supplier/catalog"
        );
    }

    private String buyerOrderUrl(MaterialOrder order) {
        String prefix = order.getOrderedBy().getRole() == UserRole.CLIENT ? "/client" : "/builder";
        return prefix + "/orders/" + order.getId();
    }
}
