package com.builderconnect.service;

import com.builderconnect.dto.request.LoginRequest;
import com.builderconnect.dto.request.RegisterRequest;
import com.builderconnect.dto.response.AuthResponse;
import com.builderconnect.entity.AuditLog;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Service for authentication operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final AuditService auditService;
    private final BuilderProfileRepository builderProfileRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final SystemSettingService systemSettingService;
    private final NotificationPreferenceService notificationPreferenceService;

    private static final Set<UserRole> SELF_REGISTER_ROLES =
        Set.of(UserRole.CLIENT, UserRole.BUILDER, UserRole.SUPPLIER);

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getRole() == null || !SELF_REGISTER_ROLES.contains(request.getRole())) {
            throw new BadRequestException(
                "Self-registration is only available for CLIENT, BUILDER, and SUPPLIER accounts");
        }

        // Check if email already exists (generic message to prevent enumeration)
        if (userRepository.existsByEmailAndDeletedFalse(request.getEmail())) {
            throw new BadRequestException("Registration could not be completed. Please try again or use a different email.");
        }

        // Create user
        User user = User.builder()
            .email(request.getEmail().toLowerCase().trim())
            .password(passwordEncoder.encode(request.getPassword()))
            .name(request.getName())
            .phone(request.getPhone())
            .role(request.getRole())
            .city(request.getCity())
            .address(request.getAddress())
            .emailVerificationToken(UUID.randomUUID().toString())
            .emailVerificationExpiresAt(LocalDateTime.now().plusDays(1))
            .build();

        user = userRepository.save(user);

        // Create role-specific profile
        if (request.getRole() == UserRole.BUILDER) {
            createBuilderProfile(user, request);
        } else if (request.getRole() == UserRole.SUPPLIER) {
            createSupplierProfile(user, request);
        }

        // Seed notification preferences up front (the V17 migration only covered pre-existing users)
        notificationPreferenceService.getOrCreate(user);

        // Send verification email
        emailService.sendVerificationEmail(user);

        // Log audit
        auditService.logAction(user, "USER_REGISTERED", "User registered successfully");

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        // Save refresh token
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiresAt(
            LocalDateTime.now().plus(Duration.ofMillis(jwtTokenProvider.getRefreshTokenExpirationMs()))
        );
        userRepository.save(user);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    @Transactional(noRollbackFor = {UnauthorizedException.class})
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // Pre-check: is account locked?
        User existingUser = userRepository.findByEmailAndDeletedFalse(email).orElse(null);
        if (existingUser != null && existingUser.getAccountLockedUntil() != null
                && existingUser.getAccountLockedUntil().isAfter(LocalDateTime.now())) {
            log.info("Login blocked for locked account: {}", existingUser.getId());
            auditService.logAction(existingUser, "LOGIN_BLOCKED_LOCKED", "USER", existingUser.getId(),
                "Login attempt blocked: account is temporarily locked",
                AuditLog.AuditStatus.FAILURE, null);
            throw new UnauthorizedException("Account temporarily locked due to too many failed attempts. Try again later.");
        }
        // Clear expired lockout so isAccountNonLocked() passes in Spring Security
        if (existingUser != null && existingUser.getAccountLockedUntil() != null
                && existingUser.getAccountLockedUntil().isBefore(LocalDateTime.now())) {
            existingUser.setAccountLockedUntil(null);
            existingUser.setFailedLoginAttempts(0);
            userRepository.save(existingUser);
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            User user = (User) authentication.getPrincipal();

            // Check if account is suspended (after credential verification so the
            // suspended state is only revealed to someone holding the password)
            if (user.getSuspended()) {
                log.info("Login blocked for suspended user: {}", user.getId());
                throw new UnauthorizedException(suspensionMessage(user));
            }

            // Block login until the email address is verified.
            // The "verify your email" phrase is a stable sentinel the frontend matches on
            // to surface a "resend verification" action.
            if (!user.getEmailVerified()) {
                log.info("Login blocked for unverified user: {}", user.getId());
                throw new UnauthorizedException(
                    "Please verify your email before logging in. Check your inbox for the verification link.");
            }

            // 2FA not yet implemented — auto-disable if a user somehow enabled it
            if (user.getTwoFactorEnabled()) {
                log.warn("User {} had 2FA enabled but feature is not implemented — auto-disabling", user.getId());
                user.setTwoFactorEnabled(false);
                user.setTwoFactorSecret(null);
            }

            // Reset failed attempts on successful login
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);

            // Generate tokens
            String accessToken = jwtTokenProvider.generateAccessToken(user);
            String refreshToken = jwtTokenProvider.generateRefreshToken(user);

            // Update user
            user.setLastLogin(LocalDateTime.now());
            user.setRefreshToken(refreshToken);
            user.setRefreshTokenExpiresAt(
                LocalDateTime.now().plus(Duration.ofMillis(jwtTokenProvider.getRefreshTokenExpirationMs()))
            );
            userRepository.save(user);

            // Log audit
            auditService.logAction(user, "USER_LOGIN", "User logged in successfully");

            return buildAuthResponse(user, accessToken, refreshToken);

        } catch (UnauthorizedException | BadRequestException e) {
            throw e;
        } catch (LockedException e) {
            throw new UnauthorizedException("Account temporarily locked due to too many failed attempts. Try again later.");
        } catch (Exception e) {
            // Increment failed login attempts
            userRepository.findByEmailAndDeletedFalse(email).ifPresentOrElse(u -> {
                int attempts = u.getFailedLoginAttempts() + 1;
                u.setFailedLoginAttempts(attempts);
                boolean locked = attempts >= MAX_FAILED_ATTEMPTS;
                if (locked) {
                    u.setAccountLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
                    log.warn("Account locked for user {} after {} failed attempts", u.getId(), attempts);
                }
                userRepository.save(u);
                auditService.logAction(u, "LOGIN_FAILED", "USER", u.getId(),
                    "Failed login attempt " + attempts + "/" + MAX_FAILED_ATTEMPTS
                        + " for " + truncateForAudit(email),
                    AuditLog.AuditStatus.FAILURE, null);
                if (locked) {
                    auditService.logAction(u, "USER_ACCOUNT_LOCKED", "USER", u.getId(),
                        "Account locked for " + LOCKOUT_DURATION_MINUTES + " minutes after "
                            + MAX_FAILED_ATTEMPTS + " failed attempts",
                        AuditLog.AuditStatus.FAILURE, null);
                }
            }, () ->
                auditService.logAction(null, "LOGIN_FAILED", "USER", null,
                    "Failed login attempt for " + truncateForAudit(email),
                    AuditLog.AuditStatus.FAILURE, null));
            log.warn("Login failed for email: {}", email);
            throw new UnauthorizedException("Invalid email or password");
        }
    }

    @Transactional
    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (user.getSuspended()) {
            log.info("Refresh blocked for suspended user: {}", user.getId());
            throw new UnauthorizedException(suspensionMessage(user));
        }

        // Verify refresh token matches
        if (!refreshToken.equals(user.getRefreshToken())) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        // Check expiration
        if (user.getRefreshTokenExpiresAt() != null &&
            user.getRefreshTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expired");
        }

        // Generate new tokens
        String newAccessToken = jwtTokenProvider.generateAccessToken(user);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user);

        // Update refresh token
        user.setRefreshToken(newRefreshToken);
        user.setRefreshTokenExpiresAt(
            LocalDateTime.now().plus(Duration.ofMillis(jwtTokenProvider.getRefreshTokenExpirationMs()))
        );
        userRepository.save(user);

        return buildAuthResponse(user, newAccessToken, newRefreshToken);
    }

    @Transactional
    public void logout(User user) {
        user.setRefreshToken(null);
        user.setRefreshTokenExpiresAt(null);
        userRepository.save(user);
        auditService.logAction(user, "USER_LOGOUT", "User logged out");
    }

    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationTokenAndDeletedFalse(token)
            .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        if (user.getEmailVerificationExpiresAt() != null &&
            user.getEmailVerificationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Verification token expired");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        userRepository.save(user);

        emailService.sendWelcomeEmail(user);
        auditService.logAction(user, "EMAIL_VERIFIED", "Email verified successfully");
    }

    /**
     * Re-issues a verification email with a fresh token. Silent no-op for unknown or
     * already-verified accounts so this endpoint cannot be used to enumerate emails.
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmailAndDeletedFalse(email.toLowerCase().trim())
            .orElse(null);

        if (user == null) {
            log.info("Verification resend requested for non-existent email: {}", email);
            return;
        }
        if (user.getEmailVerified()) {
            log.info("Verification resend requested for already-verified user: {}", user.getId());
            return;
        }

        user.setEmailVerificationToken(UUID.randomUUID().toString());
        user.setEmailVerificationExpiresAt(LocalDateTime.now().plusDays(1));
        userRepository.save(user);

        emailService.sendVerificationEmail(user);
        auditService.logAction(user, "VERIFICATION_RESENT", "Verification email resent");
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmailAndDeletedFalse(email.toLowerCase().trim())
            .orElse(null);

        // Don't reveal if email exists
        if (user == null) {
            log.info("Password reset requested for non-existent email: {}", email);
            return;
        }

        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetExpiresAt(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user, resetToken);
        auditService.logAction(user, "PASSWORD_RESET_REQUESTED", "Password reset requested");
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetTokenAndDeletedFalse(token)
            .orElseThrow(() -> new BadRequestException("Invalid reset token"));

        if (user.getPasswordResetExpiresAt() != null &&
            user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset token expired");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        // Rotating the password clears any active lockout and terminates existing sessions
        // (an attacker who triggered a lockout, or holds a stale refresh token, is locked out).
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        user.setRefreshToken(null);
        user.setRefreshTokenExpiresAt(null);
        userRepository.save(user);

        auditService.logAction(user, "PASSWORD_RESET", "Password reset successfully");
    }

    private static String truncateForAudit(String email) {
        return email != null && email.length() > 100 ? email.substring(0, 100) : email;
    }

    private static String suspensionMessage(User user) {
        String reason = user.getSuspensionReason();
        if (reason == null || reason.isBlank()) {
            return "Your account has been suspended. Please contact support.";
        }
        return "Your account has been suspended. Reason: " + reason;
    }

    private void createBuilderProfile(User user, RegisterRequest request) {
        BuilderProfile profile = BuilderProfile.builder()
            .user(user)
            .companyName(request.getCompanyName())
            .yearsOfExperience(request.getYearsOfExperience() != null ? request.getYearsOfExperience() : 0)
            .leadCredits(systemSettingService.getInt(SystemSettingService.KEY_DEFAULT_LEAD_CREDITS, 5))
            .build();
        user.setBuilderProfile(profile);
    }

    private void createSupplierProfile(User user, RegisterRequest request) {
        SupplierProfile profile = SupplierProfile.builder()
            .user(user)
            .companyName(request.getCompanyName() != null ? request.getCompanyName() : user.getName())
            .warehouseAddress(request.getWarehouseAddress())
            .build();
        user.setSupplierProfile(profile);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.of(
            accessToken,
            refreshToken,
            jwtTokenProvider.getAccessTokenExpirationMs() / 1000,
            buildUserInfo(user)
        );
    }

    /**
     * Build the UserInfo payload, including the role-specific profile summary the dashboards read.
     * Profiles are loaded via their repositories (not lazy navigation) so this is safe for the
     * detached principal used by /v1/auth/me.
     */
    public AuthResponse.UserInfo buildUserInfo(User user) {
        AuthResponse.UserInfo.UserInfoBuilder builder = AuthResponse.UserInfo.builder()
            .id(user.getId())
            .email(user.getEmail())
            .name(user.getName())
            .role(user.getRole())
            .profileImageUrl(user.getProfileImageUrl())
            .emailVerified(user.getEmailVerified())
            .twoFactorEnabled(user.getTwoFactorEnabled())
            .phone(user.getPhone())
            .city(user.getCity())
            .address(user.getAddress());

        if (user.getRole() == UserRole.BUILDER) {
            builderProfileRepository.findByUserId(user.getId()).ifPresent(p ->
                builder.builderProfile(AuthResponse.BuilderProfileInfo.builder()
                    .leadCredits(p.getLeadCredits())
                    .averageRating(p.getAverageRating())
                    .totalProjectsCompleted(p.getTotalProjectsCompleted())
                    .totalEarnings(p.getTotalEarnings())
                    .subscriptionTier(p.getSubscriptionTier())
                    .isVerified(p.getIsVerified())
                    .companyName(p.getCompanyName())
                    .build()));
        } else if (user.getRole() == UserRole.SUPPLIER) {
            supplierProfileRepository.findByUserId(user.getId()).ifPresent(s ->
                builder.supplierProfile(AuthResponse.SupplierProfileInfo.builder()
                    .isVerified(s.getIsVerified())
                    .averageRating(s.getAverageRating())
                    .companyName(s.getCompanyName())
                    .build()));
        }
        return builder.build();
    }
}
