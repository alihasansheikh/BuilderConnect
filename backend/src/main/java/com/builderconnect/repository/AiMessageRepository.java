package com.builderconnect.repository;

import com.builderconnect.entity.AiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Owner-scoped access to a user's AI Assistant thread. Every query keys on
 * user id, so a caller can only ever read or clear their own messages.
 */
@Repository
public interface AiMessageRepository extends JpaRepository<AiMessage, Long> {

    List<AiMessage> findByUserIdOrderByCreatedAtAsc(Long userId);

    @Modifying
    @Query("DELETE FROM AiMessage m WHERE m.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
