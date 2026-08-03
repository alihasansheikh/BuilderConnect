package com.builderconnect.exception;

/**
 * Thrown when the upstream LLM provider cannot fulfil a request (network error,
 * timeout, quota/rate limit, safety block, or an unparseable response). Mapped
 * to HTTP 503 so the client can show a "busy, try again" state rather than a
 * hard error.
 */
public class LlmUnavailableException extends RuntimeException {

    public LlmUnavailableException(String message) {
        super(message);
    }

    public LlmUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
