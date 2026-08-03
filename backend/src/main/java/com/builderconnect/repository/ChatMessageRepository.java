package com.builderconnect.repository;

import com.builderconnect.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for ChatMessage entity operations.
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Page<ChatMessage> findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(Long chatRoomId, Pageable pageable);

    List<ChatMessage> findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtAsc(Long chatRoomId);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.isDeleted = false " +
           "AND cm.createdAt > :since ORDER BY cm.createdAt ASC")
    List<ChatMessage> findNewMessages(@Param("chatRoomId") Long chatRoomId, @Param("since") LocalDateTime since);

    long countByChatRoomId(Long chatRoomId);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :chatRoomId ORDER BY cm.createdAt DESC LIMIT 1")
    ChatMessage findLatestMessage(@Param("chatRoomId") Long chatRoomId);

    List<ChatMessage> findBySenderIdOrderByCreatedAtDesc(Long senderId);
}
