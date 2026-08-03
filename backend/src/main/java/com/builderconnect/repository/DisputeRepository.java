package com.builderconnect.repository;

import com.builderconnect.entity.Dispute;
import com.builderconnect.entity.Dispute.DisputeStatus;
import com.builderconnect.entity.Dispute.DisputeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, Long> {

    Page<Dispute> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    Page<Dispute> findByFiledByIdOrderByCreatedAtDesc(Long filedById, Pageable pageable);

    Page<Dispute> findByFiledAgainstIdOrderByCreatedAtDesc(Long filedAgainstId, Pageable pageable);

    Page<Dispute> findByStatusOrderByCreatedAtDesc(DisputeStatus status, Pageable pageable);

    Optional<Dispute> findByDisputeNumber(String disputeNumber);

    @Query("SELECT d FROM Dispute d WHERE d.filedBy.id = :userId OR d.filedAgainst.id = :userId ORDER BY d.createdAt DESC")
    Page<Dispute> findByUserInvolved(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT d FROM Dispute d WHERE " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:disputeType IS NULL OR d.disputeType = :disputeType) " +
           "ORDER BY d.createdAt DESC")
    Page<Dispute> findAllWithFilters(
            @Param("status") DisputeStatus status,
            @Param("disputeType") DisputeType disputeType,
            Pageable pageable);


    long countByStatus(DisputeStatus status);
}
