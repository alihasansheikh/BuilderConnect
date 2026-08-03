package com.builderconnect.service;

import com.builderconnect.dto.request.MilestoneUpdateRequest;
import com.builderconnect.dto.response.MilestoneUpdateResponse;
import com.builderconnect.entity.Milestone;
import com.builderconnect.entity.MilestoneUpdate;
import com.builderconnect.entity.User;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.MilestoneUpdateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for milestone progress updates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MilestoneUpdateService {

    private final MilestoneUpdateRepository milestoneUpdateRepository;
    private final MilestoneRepository milestoneRepository;

    /**
     * Add a progress update to a milestone.
     */
    @Transactional
    public MilestoneUpdateResponse addUpdate(User user, Long milestoneId, MilestoneUpdateRequest request) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        MilestoneUpdate.UpdateType type = MilestoneUpdate.UpdateType.PROGRESS;
        if (request.getUpdateType() != null) {
            try {
                type = MilestoneUpdate.UpdateType.valueOf(request.getUpdateType());
            } catch (IllegalArgumentException e) {
                // default to PROGRESS
            }
        }

        MilestoneUpdate update = MilestoneUpdate.builder()
                .milestone(milestone)
                .createdBy(user)
                .updateType(type)
                .message(request.getMessage())
                .progressPercentage(request.getProgressPercentage())
                .attachments(request.getAttachments())
                .build();

        update = milestoneUpdateRepository.save(update);

        // Update milestone progress if percentage provided
        if (request.getProgressPercentage() != null && request.getProgressPercentage() > milestone.getProgressPercentage()) {
            milestone.setProgressPercentage(request.getProgressPercentage());
            milestoneRepository.save(milestone);
        }

        log.info("Milestone update added by user {} for milestone {} (type: {})",
                user.getId(), milestoneId, type);

        return MilestoneUpdateResponse.fromEntity(update);
    }

    /**
     * Get all updates for a milestone.
     */
    @Transactional(readOnly = true)
    public List<MilestoneUpdateResponse> getUpdates(Long milestoneId) {
        if (!milestoneRepository.existsById(milestoneId)) {
            throw new ResourceNotFoundException("Milestone not found: " + milestoneId);
        }

        return milestoneUpdateRepository.findByMilestoneIdOrderByCreatedAtDesc(milestoneId)
                .stream()
                .map(MilestoneUpdateResponse::fromEntity)
                .toList();
    }
}
