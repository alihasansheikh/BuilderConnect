package com.builderconnect.exception;

import lombok.Getter;

/**
 * Exception thrown when a client exceeds the rate limit.
 * Primarily used for service-layer rate limiting if needed;
 * the RateLimitFilter handles HTTP 429 responses directly.
 */
@Getter
public class RateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public RateLimitExceededException(long retryAfterSeconds) {
        this("Rate limit exceeded. Please try again later.", retryAfterSeconds);
    }
}
