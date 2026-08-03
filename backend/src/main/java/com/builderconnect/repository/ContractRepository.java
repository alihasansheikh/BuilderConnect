package com.builderconnect.repository;

import com.builderconnect.entity.Contract;
import com.builderconnect.enums.ContractStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for Contract entity operations.
 */
@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    Optional<Contract> findByProjectId(Long projectId);

    Optional<Contract> findByContractNumber(String contractNumber);

    Page<Contract> findByClientId(Long clientId, Pageable pageable);

    Page<Contract> findByBuilderId(Long builderId, Pageable pageable);

    Page<Contract> findByBuilderIdAndStatus(Long builderId, ContractStatus status, Pageable pageable);

    boolean existsByProjectId(Long projectId);

    // Contract number generation
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number, 10) AS BIGINT)), 0) + 1 FROM contracts WHERE contract_number LIKE :prefix%", nativeQuery = true)
    Long getNextContractNumber(@Param("prefix") String prefix);
}
