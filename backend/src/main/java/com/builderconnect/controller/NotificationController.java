package com.builderconnect.controller;

import com.builderconnect.dto.request.NotificationPreferenceRequest;
import com.builderconnect.dto.response.NotificationPreferenceResponse;
import com.builderconnect.entity.Notification;
import com.builderconnect.entity.NotificationPreference;
import com.builderconnect.entity.User;
import com.builderconnect.service.NotificationPreferenceService;
import com.builderconnect.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for notification management.
 */
@RestController
@RequestMapping("/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Notification endpoints")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping
    @Operation(summary = "Get paginated notifications for current user")
    public ResponseEntity<Page<Notification>> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Boolean isRead,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<Notification> notifications = notificationService.getUserNotifications(user.getId(), isRead, pageable);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread notification count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User user) {
        long count = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        notificationService.markAsRead(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/preferences")
    @Operation(summary = "Get notification preferences for current user")
    public ResponseEntity<NotificationPreferenceResponse> getPreferences(
            @AuthenticationPrincipal User user) {
        NotificationPreference pref = notificationPreferenceService.getOrCreate(user);
        return ResponseEntity.ok(NotificationPreferenceResponse.fromEntity(pref));
    }

    @PutMapping("/preferences")
    @Operation(summary = "Update notification preferences for current user")
    public ResponseEntity<NotificationPreferenceResponse> updatePreferences(
            @AuthenticationPrincipal User user,
            @RequestBody NotificationPreferenceRequest request) {
        NotificationPreference pref = notificationPreferenceService.update(user, request);
        return ResponseEntity.ok(NotificationPreferenceResponse.fromEntity(pref));
    }
}
