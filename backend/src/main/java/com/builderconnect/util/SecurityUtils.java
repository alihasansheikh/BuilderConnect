package com.builderconnect.util;

import com.builderconnect.entity.User;
import com.builderconnect.exception.UnauthorizedException;

public final class SecurityUtils {

    private SecurityUtils() {}

    /**
     * Validates that the user's account is not suspended.
     * Should be called at the start of all write operations.
     */
    public static void validateNotSuspended(User user) {
        if (Boolean.TRUE.equals(user.getSuspended())) {
            throw new UnauthorizedException("Your account is suspended");
        }
    }
}
