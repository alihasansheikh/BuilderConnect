package com.builderconnect.service;

import com.builderconnect.dto.request.LoginRequest;
import com.builderconnect.dto.request.RegisterRequest;
import com.builderconnect.dto.response.AuthResponse;
import com.builderconnect.entity.AuditLog;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditService auditService;

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private SupplierProfileRepository supplierProfileRepository;

    @Mock
    private SystemSettingService systemSettingService;

    @Mock
    private NotificationPreferenceService notificationPreferenceService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User testUser;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .email("test@example.com")
                .password("Password123!")
                .name("Test User")
                .phone("+923001234567")
                .role(UserRole.CLIENT)
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("Password123!")
                .build();

        testUser = User.builder()
                .email("test@example.com")
                .password("encodedPassword")
                .name("Test User")
                .role(UserRole.CLIENT)
                .active(true)
                .emailVerified(true)   // verified account — login now requires a verified email
                .suspended(false)
                .build();
        testUser.setId(1L);
    }

    @Test
    @DisplayName("Should register new user successfully")
    void register_WithValidData_ShouldSucceed() {
        // Given
        when(userRepository.existsByEmailAndDeletedFalse(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtTokenProvider.generateAccessToken(any(User.class))).thenReturn("accessToken");
        when(jwtTokenProvider.generateRefreshToken(any(User.class))).thenReturn("refreshToken");
        when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(3600000L);
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(86400000L);

        // When
        AuthResponse response = authService.register(registerRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getUser().getEmail()).isEqualTo(registerRequest.getEmail());
        verify(userRepository, times(2)).save(any(User.class));
        verify(emailService).sendVerificationEmail(any(User.class));
    }

    @Test
    @DisplayName("Should reject self-registration with ADMIN role")
    void register_WithAdminRole_ShouldThrowException() {
        registerRequest.setRole(UserRole.ADMIN);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Self-registration is only available");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void register_WithExistingEmail_ShouldThrowException() {
        // Given
        when(userRepository.existsByEmailAndDeletedFalse(anyString())).thenReturn(true);

        // When/Then
        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Registration could not be completed");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should login user successfully")
    void login_WithValidCredentials_ShouldSucceed() {
        // Given
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(jwtTokenProvider.generateAccessToken(any(User.class))).thenReturn("accessToken");
        when(jwtTokenProvider.generateRefreshToken(any(User.class))).thenReturn("refreshToken");
        when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(3600000L);
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(86400000L);

        // When
        AuthResponse response = authService.login(loginRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("accessToken");
        assertThat(response.getRefreshToken()).isEqualTo("refreshToken");
        verify(auditService).logAction(any(), eq("USER_LOGIN"), anyString());
    }

    @Test
    @DisplayName("Should reject login for suspended user with the suspension reason")
    void login_WithSuspendedAccount_ShouldThrowWithReason() {
        // Given — credentials verify (DaoAuthenticationProvider succeeds), user is suspended
        testUser.setSuspended(true);
        testUser.setSuspensionReason("Fraudulent activity reported");
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);

        // When/Then
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("suspended")
                .hasMessageContaining("Fraudulent activity reported");

        verify(jwtTokenProvider, never()).generateAccessToken(any(User.class));
    }

    @Test
    @DisplayName("Should reject login for suspended user without reason using fallback message")
    void login_WithSuspendedAccountNoReason_ShouldThrowFallbackMessage() {
        // Given
        testUser.setSuspended(true);
        testUser.setSuspensionReason(null);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);

        // When/Then
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Your account has been suspended. Please contact support.");
    }

    @Test
    @DisplayName("Should lock account after 5 failed attempts, audit each failure, and block the 6th")
    void login_AfterFiveFailedAttempts_ShouldLockAndAuditFailures() {
        // Given — user exists but the password is always wrong
        testUser.setFailedLoginAttempts(0);
        when(userRepository.findByEmailAndDeletedFalse("test@example.com"))
                .thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // When — 5 failed attempts
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("Invalid email or password");
        }

        // Then — account is locked and the 6th attempt is blocked with the lockout message
        assertThat(testUser.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(testUser.getAccountLockedUntil()).isNotNull();

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("temporarily locked");

        verify(auditService, times(5)).logAction(eq(testUser), eq("LOGIN_FAILED"), eq("USER"), eq(1L),
                anyString(), eq(AuditLog.AuditStatus.FAILURE), isNull());
        verify(auditService).logAction(eq(testUser), eq("USER_ACCOUNT_LOCKED"), eq("USER"), eq(1L),
                anyString(), eq(AuditLog.AuditStatus.FAILURE), isNull());
        verify(auditService).logAction(eq(testUser), eq("LOGIN_BLOCKED_LOCKED"), eq("USER"), eq(1L),
                anyString(), eq(AuditLog.AuditStatus.FAILURE), isNull());
    }

    @Test
    @DisplayName("Should audit failed login for unknown email with null user")
    void login_WithUnknownEmail_ShouldAuditFailureWithoutUser() {
        // Given — no such account
        when(userRepository.findByEmailAndDeletedFalse("test@example.com"))
                .thenReturn(Optional.empty());
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // When/Then
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid email or password");

        verify(auditService).logAction(isNull(), eq("LOGIN_FAILED"), eq("USER"), isNull(),
                eq("Failed login attempt for test@example.com"),
                eq(AuditLog.AuditStatus.FAILURE), isNull());
    }

    @Test
    @DisplayName("Should refresh token successfully")
    void refreshToken_WithValidToken_ShouldSucceed() {
        // Given
        String refreshToken = "validRefreshToken";
        testUser.setRefreshToken(refreshToken);
        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(refreshToken)).thenReturn(1L);
        when(userRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateAccessToken(testUser)).thenReturn("newAccessToken");
        when(jwtTokenProvider.generateRefreshToken(testUser)).thenReturn("newRefreshToken");
        when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(3600000L);
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(86400000L);

        // When
        AuthResponse response = authService.refreshToken(refreshToken);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("newAccessToken");
    }

    @Test
    @DisplayName("Should reject refresh token for suspended user")
    void refreshToken_WithSuspendedUser_ShouldThrow() {
        // Given — an otherwise valid refresh token held by a now-suspended user
        String refreshToken = "validRefreshToken";
        testUser.setRefreshToken(refreshToken);
        testUser.setSuspended(true);
        testUser.setSuspensionReason("Policy violation");
        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(refreshToken)).thenReturn(1L);
        when(userRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(testUser));

        // When/Then
        assertThatThrownBy(() -> authService.refreshToken(refreshToken))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("suspended")
                .hasMessageContaining("Policy violation");

        verify(jwtTokenProvider, never()).generateAccessToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception for invalid refresh token")
    void refreshToken_WithInvalidToken_ShouldThrowException() {
        // Given
        String invalidToken = "invalidToken";
        when(jwtTokenProvider.validateToken(invalidToken)).thenReturn(false);

        // When/Then
        assertThatThrownBy(() -> authService.refreshToken(invalidToken))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    @Test
    @DisplayName("Should reset password, clear lockout state, and terminate existing sessions")
    void resetPassword_WithValidToken_ClearsLockoutAndRefreshToken() {
        // Given — a locked account with an active session and a valid reset token
        String token = "valid-reset-token";
        testUser.setFailedLoginAttempts(4);
        testUser.setAccountLockedUntil(java.time.LocalDateTime.now().plusMinutes(10));
        testUser.setRefreshToken("stale-refresh-token");
        testUser.setRefreshTokenExpiresAt(java.time.LocalDateTime.now().plusDays(3));
        testUser.setPasswordResetToken(token);
        testUser.setPasswordResetExpiresAt(java.time.LocalDateTime.now().plusMinutes(30));
        when(userRepository.findByPasswordResetTokenAndDeletedFalse(token)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("NewPassword123!")).thenReturn("newEncodedPassword");

        // When
        authService.resetPassword(token, "NewPassword123!");

        // Then — password rotated, token consumed, lockout cleared, sessions killed
        assertThat(testUser.getPassword()).isEqualTo("newEncodedPassword");
        assertThat(testUser.getPasswordResetToken()).isNull();
        assertThat(testUser.getPasswordResetExpiresAt()).isNull();
        assertThat(testUser.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(testUser.getAccountLockedUntil()).isNull();
        assertThat(testUser.getRefreshToken()).isNull();
        assertThat(testUser.getRefreshTokenExpiresAt()).isNull();
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Should reject password reset with an invalid token")
    void resetPassword_WithInvalidToken_ShouldThrow() {
        when(userRepository.findByPasswordResetTokenAndDeletedFalse("bad-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword("bad-token", "NewPassword123!"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid reset token");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should verify email successfully")
    void verifyEmail_WithValidToken_ShouldSucceed() {
        // Given
        String token = "validToken";
        testUser.setEmailVerificationToken(token);
        when(userRepository.findByEmailVerificationTokenAndDeletedFalse(token)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        authService.verifyEmail(token);

        // Then
        verify(userRepository).save(testUser);
        assertThat(testUser.getEmailVerified()).isTrue();
    }
}
