package com.builderconnect.enums;

/**
 * Defines the lifecycle states of a contract.
 */
public enum ContractStatus {
    DRAFT("Draft"),
    PENDING_CLIENT("Pending Client Signature"),
    PENDING_BUILDER("Pending Builder Signature"),
    ACTIVE("Active"),
    COMPLETED("Completed"),
    TERMINATED("Terminated"),
    DISPUTED("Under Dispute");

    private final String displayName;

    ContractStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isPending() {
        return this == PENDING_CLIENT || this == PENDING_BUILDER;
    }

    public boolean isActive() {
        return this == ACTIVE;
    }

    public boolean isFinal() {
        return this == COMPLETED || this == TERMINATED;
    }

    public boolean canBeSigned() {
        return this == PENDING_CLIENT || this == PENDING_BUILDER;
    }
}
