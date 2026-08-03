package com.builderconnect.repository;

import com.builderconnect.entity.TicketResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketResponseRepository extends JpaRepository<TicketResponse, Long> {

    List<TicketResponse> findByTicketIdOrderByCreatedAtAsc(Long ticketId);

    Page<TicketResponse> findByTicketIdOrderByCreatedAtAsc(Long ticketId, Pageable pageable);

    long countByTicketId(Long ticketId);
}
