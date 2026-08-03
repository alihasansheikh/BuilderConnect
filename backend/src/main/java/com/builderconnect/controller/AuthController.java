package com.builderconnect.controller;

import com.builderconnect.dto.request.*;
import com.builderconnect.dto.response.AuthResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for authentication endpoints.
 */
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User authentication and registration")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout and invalidate tokens")
    public ResponseEntity<Map<String, String>> logout(@AuthenticationPrincipal User user) {
        authService.logout(user);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verify email address")
    public ResponseEntity<Map<String, String>> verifyEmail(@Valid @RequestBody TokenRequest request) {
        authService.verifyEmail(request.getToken());
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend the email-verification link")
    public ResponseEntity<Map<String, String>> resendVerification(@Valid @RequestBody EmailRequest request) {
        authService.resendVerificationEmail(request.getEmail());
        // Generic response so the endpoint can't be used to probe which emails exist.
        return ResponseEntity.ok(Map.of("message", "If the account exists and is unverified, a new link has been sent"));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody EmailRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "If the email exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with token")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user information")
    public ResponseEntity<AuthResponse.UserInfo> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.buildUserInfo(user));
    }
}
