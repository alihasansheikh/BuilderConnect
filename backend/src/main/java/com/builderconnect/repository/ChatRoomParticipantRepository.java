package com.builderconnect.repository;

import com.builderconnect.entity.ChatRoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for ChatRoomParticipant entity operations.
 */
@Repository
public interface ChatRoomParticipantRepository extends JpaRepository<ChatRoomParticipant, Long> {

    List<ChatRoomParticipant> findByChatRoomIdAndIsActiveTrue(Long chatRoomId);

    List<ChatRoomParticipant> findByUserIdAndIsActiveTrue(Long userId);

    Optional<ChatRoomParticipant> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    boolean existsByChatRoomIdAndUserIdAndIsActiveTrue(Long chatRoomId, Long userId);

    @Query("SELECT crp FROM ChatRoomParticipant crp WHERE crp.chatRoomId = :chatRoomId AND crp.userId != :excludeUserId AND crp.isActive = true")
    List<ChatRoomParticipant> findOtherParticipants(@Param("chatRoomId") Long chatRoomId, @Param("excludeUserId") Long excludeUserId);

    @Query("SELECT cr.id FROM ChatRoom cr " +
           "JOIN ChatRoomParticipant crp1 ON cr.id = crp1.chatRoomId " +
           "JOIN ChatRoomParticipant crp2 ON cr.id = crp2.chatRoomId " +
           "WHERE cr.roomType = 'DIRECT' AND crp1.userId = :user1Id AND crp2.userId = :user2Id " +
           "AND crp1.isActive = true AND crp2.isActive = true")
    Optional<Long> findDirectRoomBetweenUsers(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    long countByChatRoomIdAndIsActiveTrue(Long chatRoomId);
}
