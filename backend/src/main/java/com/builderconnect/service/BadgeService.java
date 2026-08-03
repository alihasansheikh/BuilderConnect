package com.builderconnect.service;

import com.builderconnect.dto.response.BadgeResponse;
import com.builderconnect.dto.response.UserBadgeResponse;
import com.builderconnect.entity.Badge;
import com.builderconnect.entity.User;
import com.builderconnect.entity.UserBadge;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BadgeRepository;
import com.builderconnect.repository.UserBadgeRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for badge management — listing, awarding, revoking, and automatic badge checks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BadgeService {

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final ProjectRepository projectRepository;
    private final AuditService auditService;

    /**
     * Get all active badges.
     */
    @Transactional(readOnly = true)
    public List<BadgeResponse> getAllBadges() {
        return badgeRepository.findByIsActiveTrue().stream()
                .map(BadgeResponse::fromEntity)
                .toList();
    }

    /**
     * Get all badges earned by a specific user.
     */
    @Transactional(readOnly = true)
    public List<UserBadgeResponse> getUserBadges(Long userId) {
        // Verify user exists
        userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        return userBadgeRepository.findByUserId(userId).stream()
                .map(UserBadgeResponse::fromEntity)
                .toList();
    }

    /**
     * Award a badge to a user (admin action).
     */
    @Transactional
    public UserBadgeResponse awardBadge(User admin, Long userId, Long badgeId, String notes) {
        User targetUser = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + badgeId));

        if (!Boolean.TRUE.equals(badge.getIsActive())) {
            throw new BadRequestException("Cannot award an inactive badge");
        }

        if (userBadgeRepository.existsByUserIdAndBadgeId(userId, badgeId)) {
            throw new BadRequestException("User already has this badge");
        }

        UserBadge userBadge = UserBadge.builder()
                .user(targetUser)
                .badge(badge)
                .awardedBy(admin)
                .notes(notes)
                .build();

        userBadge = userBadgeRepository.save(userBadge);

        auditService.logAction(admin, "BADGE_AWARDED", "USER", userId,
                "Awarded badge '" + badge.getName() + "' to user " + targetUser.getName());

        log.info("Badge '{}' awarded to user {} by admin {}", badge.getCode(), userId, admin.getId());

        return UserBadgeResponse.fromEntity(userBadge);
    }

    /**
     * Revoke a badge from a user (admin action).
     */
    @Transactional
    public void revokeBadge(User admin, Long userId, Long badgeId) {
        userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + badgeId));

        List<UserBadge> userBadges = userBadgeRepository.findByUserId(userId).stream()
                .filter(ub -> ub.getBadge().getId().equals(badgeId))
                .toList();

        if (userBadges.isEmpty()) {
            throw new BadRequestException("User does not have this badge");
        }

        userBadgeRepository.deleteAll(userBadges);

        auditService.logAction(admin, "BADGE_REVOKED", "USER", userId,
                "Revoked badge '" + badge.getName() + "' from user ID " + userId);

        log.info("Badge '{}' revoked from user {} by admin {}", badge.getCode(), userId, admin.getId());
    }

    /**
     * Check and award automatic badges for a user based on their activity.
     * Called after key events (project completion, review received, etc.).
     */
    @Transactional
    public void checkAndAwardAutomaticBadges(Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElse(null);

        if (user == null) {
            return;
        }

        List<Badge> automaticBadges = badgeRepository.findByIsActiveTrue().stream()
                .filter(b -> b.getCriteriaType() == Badge.CriteriaType.AUTOMATIC)
                .toList();

        for (Badge badge : automaticBadges) {
            if (userBadgeRepository.existsByUserIdAndBadgeId(userId, badge.getId())) {
                continue; // Already has this badge
            }

            if (meetsAutomaticCriteria(user, badge)) {
                UserBadge userBadge = UserBadge.builder()
                        .user(user)
                        .badge(badge)
                        .notes("Automatically awarded")
                        .build();

                userBadgeRepository.save(userBadge);
                log.info("Auto-awarded badge '{}' to user {}", badge.getCode(), userId);
            }
        }
    }

    /**
     * Evaluate whether a user meets the automatic criteria for a badge.
     * Uses the badge code to determine which check to perform.
     */
    private boolean meetsAutomaticCriteria(User user, Badge badge) {
        String code = badge.getCode();

        switch (code) {
            case "VERIFIED_EMAIL":
                return Boolean.TRUE.equals(user.getEmailVerified());

            case "FIRST_PROJECT":
                return projectRepository.countByClientId(user.getId()) >= 1;

            case "FIVE_PROJECTS":
                return projectRepository.countByClientId(user.getId()) >= 5;

            default:
                // Unknown automatic badge — skip
                return false;
        }
    }
}
