package com.builderconnect.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for REST API.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        log.warn("Resource not found: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex, WebRequest request) {
        log.warn("Bad request: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex, WebRequest request) {
        log.warn("Unauthorized: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    @ExceptionHandler(LlmUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleLlmUnavailableException(
            LlmUnavailableException ex, WebRequest request) {
        log.warn("LLM unavailable: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE,
                "The assistant is busy right now. Please try again in a moment.", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Access denied", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(
            BadCredentialsException ex, WebRequest request) {
        log.warn("Bad credentials: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Invalid email or password", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        log.warn("Validation failed: {}", errors);

        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
            .message("Validation failed")
            .path(request.getDescription(false).replace("uri=", ""))
            .validationErrors(errors)
            .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceededException(
            RateLimitExceededException ex, WebRequest request) {
        log.warn("Rate limit exceeded: {}", ex.getMessage());
        ResponseEntity<ErrorResponse> response = buildErrorResponse(
            HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
            .body(response.getBody());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex, WebRequest request) {
        log.warn("File upload size exceeded: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "File size exceeds maximum limit of 10MB", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException ex, WebRequest request) {
        // An unmapped URL or a missing static resource is a 404, not a 500 (Spring's default for this).
        log.warn("No resource: {}", ex.getResourcePath());
        return buildErrorResponse(HttpStatus.NOT_FOUND, "The requested resource was not found", request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(
            HttpMessageNotReadableException ex, WebRequest request) {
        // A malformed or wrongly-typed JSON body (e.g. a date-only string for a datetime field) is a
        // client error, not a server fault. The raw message can expose class/field internals, so it is
        // logged rather than returned.
        log.warn("Unreadable request body: {}", ex.getMostSpecificCause().getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST,
                "The request body could not be read. Please check that every field has the expected format.",
                request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, WebRequest request) {
        // A path/query parameter that can't be coerced to its target type (e.g. a non-numeric id) is
        // a bad request, not a 500.
        log.warn("Parameter type mismatch: {} = '{}'", ex.getName(), ex.getValue());
        return buildErrorResponse(HttpStatus.BAD_REQUEST,
                "The request parameter '" + ex.getName() + "' has an invalid value.",
                request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex, WebRequest request) {
        // A value the database rejects (too long for its column, duplicate unique key, missing FK) is
        // bad input, not a server fault. The raw message names tables and columns, so it is logged
        // rather than returned.
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST,
                "The submitted data was rejected by the database. Check that every field is within its allowed length and that no duplicate value was used.",
                request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(
            IllegalStateException ex, WebRequest request) {
        // Domain state-machine conflicts (e.g. completing a milestone that isn't in progress)
        // are client errors, not server faults — surface them as 409 with the real message.
        log.warn("Illegal state: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex, WebRequest request) {
        log.error("Unhandled exception", ex);
        return buildErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "An unexpected error occurred",
            request
        );
    }

    private ResponseEntity<ErrorResponse> buildErrorResponse(
            HttpStatus status, String message, WebRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(status.value())
            .error(status.getReasonPhrase())
            .message(message)
            .path(request.getDescription(false).replace("uri=", ""))
            .build();

        return new ResponseEntity<>(errorResponse, status);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ErrorResponse {
        private LocalDateTime timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
        private Map<String, String> validationErrors;
    }
}
