package com.builderconnect.enums;

/**
 * Defines the states of a bid.
 */
public enum BidStatus {
    DRAFT("Draft"),
    SUBMITTED("Submitted"),
    UNDER_REVIEW("Under Review"),
    SHORTLISTED("Shortlisted"),
    ACCEPTED("Accepted"),
    REJECTED("Rejected"),
    WITHDRAWN("Withdrawn"),
    EXPIRED("Expired");

    private final String displayName;

    BidStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isActive() {
        return this == SUBMITTED || this == UNDER_REVIEW || this == SHORTLISTED;
    }

    public boolean isFinal() {
        return this == ACCEPTED || this == REJECTED || this == WITHDRAWN || this == EXPIRED;
    }
}
