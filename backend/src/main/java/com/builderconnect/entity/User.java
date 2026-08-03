package com.builderconnect.entity;

import com.builderconnect.enums.UserRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * User entity representing all platform users.
 * Implements UserDetails for Spring Security integration.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    // Never serialized: secrets must not leak through any endpoint that returns this entity
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(length = 100)
    private String city;

    @Column(length = 500)
    private String address;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    // Account Status
    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean suspended = false;

    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @JsonIgnore
    @Column(name = "email_verification_token", length = 100)
    private String emailVerificationToken;

    @Column(name = "email_verification_expires_at")
    private LocalDateTime emailVerificationExpiresAt;

    // Two-Factor Authentication
    @Builder.Default
    @Column(name = "two_factor_enabled", nullable = false)
    private Boolean twoFactorEnabled = false;

    @JsonIgnore
    @Column(name = "two_factor_secret", length = 100)
    private String twoFactorSecret;

    // Account Lockout
    @Builder.Default
    @Column(name = "failed_login_attempts", nullable = false)
    private Integer failedLoginAttempts = 0;

    @Column(name = "account_locked_until")
    private LocalDateTime accountLockedUntil;

    // Session Management
    @JsonIgnore
    @Column(name = "refresh_token", length = 500)
    private String refreshToken;

    @Column(name = "refresh_token_expires_at")
    private LocalDateTime refreshTokenExpiresAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    // Password Reset
    @JsonIgnore
    @Column(name = "password_reset_token", length = 100)
    private String passwordResetToken;

    @Column(name = "password_reset_expires_at")
    private LocalDateTime passwordResetExpiresAt;

    // Soft Delete
    @Builder.Default
    @Column(nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relationships — @JsonIgnore breaks the user<->profile cycle when an entity graph is serialized
    @JsonIgnore
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private BuilderProfile builderProfile;

    @JsonIgnore
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private SupplierProfile supplierProfile;

    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return !deleted;
    }

    // Suspension is intentionally NOT checked here: DaoAuthenticationProvider runs this
    // pre-auth check BEFORE password verification, which would leak the suspended state to
    // anyone probing an email. AuthService.login handles suspension after credentials pass.
    @Override
    public boolean isAccountNonLocked() {
        if (accountLockedUntil != null && accountLockedUntil.isAfter(LocalDateTime.now())) return false;
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active && !deleted;
    }

    // Helper methods
    public boolean isAdmin() {
        return role == UserRole.ADMIN || role == UserRole.SUPER_ADMIN;
    }

    public boolean isServiceProvider() {
        return role == UserRole.BUILDER || role == UserRole.SUPPLIER;
    }

    public String getFullName() {
        return name;
    }
}
