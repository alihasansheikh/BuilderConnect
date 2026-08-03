package com.builderconnect.enums;

/**
 * Defines the lifecycle states of a project.
 */
public enum ProjectStatus {
    DRAFT("Draft"),
    OPEN("Open for Bidding"),
    BIDDING("Receiving Bids"),
    AWARDED("Awarded"),
    CONTRACT_PENDING("Contract Pending"),
    IN_PROGRESS("In Progress"),
    ON_HOLD("On Hold"),
    COMPLETED("Completed"),
    CANCELLED("Cancelled"),
    DISPUTED("Under Dispute");

    private final String displayName;

    ProjectStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isActive() {
        return this == IN_PROGRESS || this == ON_HOLD;
    }

    public boolean isOpen() {
        return this == OPEN || this == BIDDING;
    }

    public boolean isClosed() {
        return this == COMPLETED || this == CANCELLED;
    }
}
