package com.builderconnect.service;

import com.builderconnect.entity.NotificationPreference;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.repository.NotificationPreferenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {

    @Mock
    private NotificationPreferenceRepository preferenceRepository;

    @InjectMocks
    private NotificationPreferenceService service;

    private User buildUser() {
        User user = User.builder()
                .email("user@example.com")
                .name("Test User")
                .role(UserRole.CLIENT)
                .build();
        user.setId(7L);
        return user;
    }

    @Test
    @DisplayName("getOrCreate returns the existing row without inserting")
    void getOrCreate_existing_returnsWithoutInsert() {
        User user = buildUser();
        NotificationPreference existing = NotificationPreference.builder().user(user).build();
        when(preferenceRepository.findByUserId(7L)).thenReturn(Optional.of(existing));

        NotificationPreference result = service.getOrCreate(user);

        assertThat(result).isSameAs(existing);
        verify(preferenceRepository, never()).save(any(NotificationPreference.class));
    }

    @Test
    @DisplayName("getOrCreate inserts a default row when none exists")
    void getOrCreate_missing_createsDefault() {
        User user = buildUser();
        when(preferenceRepository.findByUserId(7L)).thenReturn(Optional.empty());
        when(preferenceRepository.save(any(NotificationPreference.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NotificationPreference result = service.getOrCreate(user);

        assertThat(result).isNotNull();
        assertThat(result.getUser()).isSameAs(user);
        verify(preferenceRepository).save(any(NotificationPreference.class));
    }

    @Test
    @DisplayName("getOrCreate is a read-write transaction so the create-on-missing INSERT is allowed")
    void getOrCreate_isNotReadOnlyTransaction() throws Exception {
        Transactional tx = NotificationPreferenceService.class
                .getMethod("getOrCreate", User.class)
                .getAnnotation(Transactional.class);

        assertThat(tx).isNotNull();
        assertThat(tx.readOnly()).isFalse();
    }
}
