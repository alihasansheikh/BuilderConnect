package com.builderconnect.repository;

import com.builderconnect.entity.Notification;
import com.builderconnect.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Notification entity operations.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    Page<Notification> findByUserIdAndIsReadFalse(Long userId, Pageable pageable);

    long countByUserIdAndIsReadFalse(Long userId);

    List<Notification> findByUserIdAndNotificationType(Long userId, NotificationType type);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.user.id = :userId AND n.isRead = false")
    int markAllAsRead(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.id = :notificationId AND n.user.id = :userId")
    int markAsRead(@Param("notificationId") Long notificationId, @Param("userId") Long userId);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.relatedEntityType = :entityType AND n.relatedEntityId = :entityId")
    List<Notification> findByUserAndRelatedEntity(
        @Param("userId") Long userId,
        @Param("entityType") String entityType,
        @Param("entityId") Long entityId
    );
}
