package com.builderconnect.enums;

/**
 * Defines the states of a project milestone.
 */
public enum MilestoneStatus {
    PENDING("Pending"),
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed"),
    UNDER_REVIEW("Under Review"),
    APPROVED("Approved"),
    REJECTED("Rejected"),
    PAYMENT_PENDING("Payment Pending"),
    PAYMENT_RELEASED("Payment Released"),
    PAID("Paid"),
    CONFIRMED("Confirmed"),
    DISPUTED("Disputed");

    private final String displayName;

    MilestoneStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean requiresClientAction() {
        return this == COMPLETED || this == UNDER_REVIEW || this == PAYMENT_PENDING;
    }

    public boolean isPaymentRelated() {
        return this == PAYMENT_PENDING || this == PAYMENT_RELEASED;
    }

    public boolean isPaid() {
        return this == PAID;
    }

    public boolean isConfirmed() {
        return this == CONFIRMED;
    }
}
