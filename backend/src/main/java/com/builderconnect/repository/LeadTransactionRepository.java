package com.builderconnect.repository;

import com.builderconnect.entity.LeadTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeadTransactionRepository extends JpaRepository<LeadTransaction, Long> {

    Page<LeadTransaction> findByBuilderProfileIdOrderByCreatedAtDesc(Long builderProfileId, Pageable pageable);
}
