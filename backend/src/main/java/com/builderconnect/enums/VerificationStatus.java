package com.builderconnect.enums;

/**
 * Lifecycle of a builder/supplier verification request.
 * REJECTED profiles may submit a new request (back to PENDING).
 */
public enum VerificationStatus {
    UNSUBMITTED,
    PENDING,
    VERIFIED,
    REJECTED
}
