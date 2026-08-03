package com.builderconnect.repository;

import com.builderconnect.entity.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    Page<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<SupportTicket> findByUserIdAndStatusOrderByCreatedAtDesc(
            Long userId, SupportTicket.TicketStatus status, Pageable pageable);

    Page<SupportTicket> findByStatusOrderByCreatedAtDesc(SupportTicket.TicketStatus status, Pageable pageable);

    Optional<SupportTicket> findByTicketNumber(String ticketNumber);

    @Query("SELECT t FROM SupportTicket t WHERE " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:category IS NULL OR t.category = :category) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:escalated IS NULL OR t.escalated = :escalated) " +
           "ORDER BY t.createdAt DESC")
    Page<SupportTicket> findAllWithFilters(
            @Param("status") SupportTicket.TicketStatus status,
            @Param("category") SupportTicket.TicketCategory category,
            @Param("priority") SupportTicket.TicketPriority priority,
            @Param("escalated") Boolean escalated,
            Pageable pageable);

    @Query("SELECT t FROM SupportTicket t WHERE " +
           "LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "ORDER BY t.createdAt DESC")
    Page<SupportTicket> searchTickets(@Param("search") String search, Pageable pageable);


    long countByStatus(SupportTicket.TicketStatus status);

    long countByEscalatedTrue();
}
