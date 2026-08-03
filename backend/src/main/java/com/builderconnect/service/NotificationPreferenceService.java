package com.builderconnect.service;

import com.builderconnect.dto.request.NotificationPreferenceRequest;
import com.builderconnect.entity.NotificationPreference;
import com.builderconnect.entity.User;
import com.builderconnect.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;

    // Not read-only: this may INSERT a default row on first access (e.g. a user created
    // after the V17 seed migration), which fails inside a read-only transaction on MySQL.
    @Transactional
    public NotificationPreference getOrCreate(User user) {
        return preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    NotificationPreference pref = NotificationPreference.builder()
                            .user(user)
                            .build();
                    return preferenceRepository.save(pref);
                });
    }

    @Transactional
    public NotificationPreference update(User user, NotificationPreferenceRequest dto) {
        NotificationPreference pref = getOrCreate(user);

        if (dto.getEmailNewBid() != null) pref.setEmailNewBid(dto.getEmailNewBid());
        if (dto.getEmailProjectUpdate() != null) pref.setEmailProjectUpdate(dto.getEmailProjectUpdate());
        if (dto.getEmailMessages() != null) pref.setEmailMessages(dto.getEmailMessages());
        if (dto.getEmailOrderUpdate() != null) pref.setEmailOrderUpdate(dto.getEmailOrderUpdate());
        if (dto.getEmailMarketing() != null) pref.setEmailMarketing(dto.getEmailMarketing());
        if (dto.getPushNewBid() != null) pref.setPushNewBid(dto.getPushNewBid());
        if (dto.getPushProjectUpdate() != null) pref.setPushProjectUpdate(dto.getPushProjectUpdate());
        if (dto.getPushMessages() != null) pref.setPushMessages(dto.getPushMessages());

        return preferenceRepository.save(pref);
    }
}
