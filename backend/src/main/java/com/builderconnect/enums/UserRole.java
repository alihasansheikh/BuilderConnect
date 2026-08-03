package com.builderconnect.enums;

/**
 * Defines the roles available in the BuilderConnect platform.
 * Each role has specific permissions and access levels.
 */
public enum UserRole {
    CLIENT("Client"),
    BUILDER("Builder/Contractor"),
    SUPPLIER("Material Supplier"),
    SUPPORT_AGENT("Support Agent"),
    ADMIN("Administrator"),
    SUPER_ADMIN("Super Administrator");

    private final String displayName;

    UserRole(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isAdmin() {
        return this == ADMIN || this == SUPER_ADMIN;
    }

    public boolean isServiceProvider() {
        return this == BUILDER || this == SUPPLIER;
    }
}
