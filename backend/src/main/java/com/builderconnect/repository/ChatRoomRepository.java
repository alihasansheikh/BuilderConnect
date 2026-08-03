package com.builderconnect.repository;

import com.builderconnect.entity.ChatRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for ChatRoom entity operations.
 */
@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByRoomCode(String roomCode);

    Optional<ChatRoom> findByProjectId(Long projectId);

    Optional<ChatRoom> findByBidId(Long bidId);

    List<ChatRoom> findByCreatedBy(Long userId);

    @Query("SELECT cr FROM ChatRoom cr JOIN ChatRoomParticipant crp ON cr.id = crp.chatRoomId " +
           "WHERE crp.userId = :userId AND cr.isActive = true ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findUserChatRooms(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT cr FROM ChatRoom cr WHERE cr.roomType = :roomType AND cr.isActive = true")
    List<ChatRoom> findByRoomType(@Param("roomType") ChatRoom.RoomType roomType);

    boolean existsByProjectId(Long projectId);

    boolean existsByBidId(Long bidId);
}
