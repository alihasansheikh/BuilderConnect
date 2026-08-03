package com.builderconnect.enums;

/**
 * Defines the types of notifications in the system.
 */
public enum NotificationType {
    NEW_BID("New Bid Received"),
    BID_ACCEPTED("Bid Accepted"),
    BID_REJECTED("Bid Rejected"),
    BID_SHORTLISTED("Bid Shortlisted"),
    PROJECT_AWARDED("Project Awarded"),
    MILESTONE_COMPLETED("Milestone Completed"),
    MILESTONE_APPROVED("Milestone Approved"),
    PAYMENT_RECEIVED("Payment Received"),
    PAYMENT_RELEASED("Payment Released"),
    NEW_MESSAGE("New Message"),
    NEW_REVIEW("New Review"),
    DISPUTE_OPENED("Dispute Opened"),
    DISPUTE_RESOLVED("Dispute Resolved"),
    ACCOUNT_VERIFIED("Account Verified"),
    SUBSCRIPTION_EXPIRING("Subscription Expiring"),
    SYSTEM_ANNOUNCEMENT("System Announcement"),
    ORDER_PLACED("New Order Received"),
    ORDER_CONFIRMED("Order Confirmed"),
    ORDER_STATUS_UPDATED("Order Status Updated"),
    ORDER_DELIVERED("Order Delivered"),
    ORDER_CANCELLED("Order Cancelled"),
    PRODUCT_REVIEW("New Product Review"),
    VERIFICATION_REQUESTED("Verification Requested"),
    VERIFICATION_REJECTED("Verification Rejected"),
    TICKET_CREATED("Support Ticket Created"),
    TICKET_UPDATED("Support Ticket Updated");

    private final String displayName;

    NotificationType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
