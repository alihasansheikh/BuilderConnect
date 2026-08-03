package com.builderconnect.controller;

import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.MaterialOrderRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.service.AuditService;
import com.builderconnect.service.FileStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private AuditService auditService;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private MaterialOrderRepository materialOrderRepository;

    @InjectMocks
    private UserController userController;

    private User buildUser(UserRole role) {
        User user = User.builder()
                .email("user@example.com")
                .password("encoded-password")
                .name("Test User")
                .role(role)
                .build();
        user.setId(42L);
        return user;
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "SUPER_ADMIN", "SUPPORT_AGENT"})
    @DisplayName("deleteAccount rejects privileged roles")
    void deleteAccount_privilegedRole_blocked(UserRole role) {
        User user = buildUser(role);

        assertThatThrownBy(() -> userController.deleteAccount(user, Map.of("password", "password")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot be self-deleted");

        verify(userRepository, never()).save(user);
        assertThat(user.getDeleted()).isFalse();
    }

    @Test
    @DisplayName("deleteAccount rejects missing password")
    void deleteAccount_missingPassword_badRequest() {
        User user = buildUser(UserRole.CLIENT);

        assertThatThrownBy(() -> userController.deleteAccount(user, Map.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Password is required");

        verify(userRepository, never()).save(user);
    }

    @Test
    @DisplayName("deleteAccount rejects wrong password with 400 (not 401, to avoid a wasted token refresh)")
    void deleteAccount_wrongPassword_badRequest() {
        User user = buildUser(UserRole.CLIENT);
        when(passwordEncoder.matches("wrong", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> userController.deleteAccount(user, Map.of("password", "wrong")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Incorrect password");

        verify(userRepository, never()).save(user);
        assertThat(user.getDeleted()).isFalse();
    }

    @Test
    @DisplayName("deleteAccount is blocked while the user has active projects")
    void deleteAccount_activeProjects_blocked() {
        User user = buildUser(UserRole.CLIENT);
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);
        when(projectRepository.countActiveForUser(eq(42L), any())).thenReturn(2L);

        assertThatThrownBy(() -> userController.deleteAccount(user, Map.of("password", "correct")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("2 active projects")
                .hasMessageContaining("complete or cancel");

        verify(userRepository, never()).save(user);
        assertThat(user.getDeleted()).isFalse();
    }

    @Test
    @DisplayName("deleteAccount is blocked while the user has open marketplace orders")
    void deleteAccount_openOrders_blocked() {
        User user = buildUser(UserRole.SUPPLIER);
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);
        when(materialOrderRepository.countOpenForUser(eq(42L), any())).thenReturn(1L);

        assertThatThrownBy(() -> userController.deleteAccount(user, Map.of("password", "correct")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("1 open marketplace order");

        verify(userRepository, never()).save(user);
        assertThat(user.getDeleted()).isFalse();
    }

    @Test
    @DisplayName("deleteAccount soft-deletes, clears refresh token, and audits")
    void deleteAccount_success_softDeletes() {
        User user = buildUser(UserRole.CLIENT);
        user.setRefreshToken("refresh-token");
        user.setRefreshTokenExpiresAt(LocalDateTime.now().plusDays(7));
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);

        ResponseEntity<Map<String, String>> response =
                userController.deleteAccount(user, Map.of("password", "correct"));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(user.getDeleted()).isTrue();
        assertThat(user.getDeletedAt()).isNotNull();
        assertThat(user.getRefreshToken()).isNull();
        assertThat(user.getRefreshTokenExpiresAt()).isNull();
        verify(userRepository).save(user);
        verify(auditService).logAction(eq(user), eq("ACCOUNT_DELETED"), eq("USER"), eq(42L), anyString());
    }

    @Test
    @DisplayName("deleteAccount tombstones the email so it can be re-registered (users.email is UNIQUE)")
    void deleteAccount_success_tombstonesEmail() {
        User user = buildUser(UserRole.CLIENT);
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);

        userController.deleteAccount(user, Map.of("password", "correct"));

        assertThat(user.getEmail()).isEqualTo("deleted-42-user@example.com");
    }

    @Test
    @DisplayName("deleteAccount truncates an overlong tombstoned email to the 100-char column width")
    void deleteAccount_longEmail_truncatesTombstone() {
        User user = buildUser(UserRole.CLIENT);
        user.setEmail("a".repeat(88) + "@example.com");
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);

        userController.deleteAccount(user, Map.of("password", "correct"));

        assertThat(user.getEmail()).hasSize(100).startsWith("deleted-42-");
    }

    @Test
    @DisplayName("changePassword rejects blank fields with 400")
    void changePassword_blankFields_badRequest() {
        User user = buildUser(UserRole.CLIENT);

        assertThatThrownBy(() -> userController.changePassword(user, Map.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("required");

        verify(userRepository, never()).save(user);
    }

    @Test
    @DisplayName("changePassword rejects a wrong current password with 400")
    void changePassword_wrongCurrent_badRequest() {
        User user = buildUser(UserRole.CLIENT);
        when(passwordEncoder.matches("wrong", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> userController.changePassword(user,
                Map.of("currentPassword", "wrong", "newPassword", "newpassword123")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Incorrect password");

        verify(userRepository, never()).save(user);
    }

    @Test
    @DisplayName("changePassword rejects a too-short new password with 400")
    void changePassword_shortNewPassword_badRequest() {
        User user = buildUser(UserRole.CLIENT);
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);

        assertThatThrownBy(() -> userController.changePassword(user,
                Map.of("currentPassword", "correct", "newPassword", "short")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least 8");

        verify(userRepository, never()).save(user);
    }

    @Test
    @DisplayName("changePassword encodes and saves a valid new password")
    void changePassword_valid_updatesPassword() {
        User user = buildUser(UserRole.CLIENT);
        when(passwordEncoder.matches("correct", "encoded-password")).thenReturn(true);
        when(passwordEncoder.encode("newpassword123")).thenReturn("new-encoded");

        ResponseEntity<Map<String, String>> response = userController.changePassword(user,
                Map.of("currentPassword", "correct", "newPassword", "newpassword123"));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(user.getPassword()).isEqualTo("new-encoded");
        verify(userRepository).save(user);
    }
}
