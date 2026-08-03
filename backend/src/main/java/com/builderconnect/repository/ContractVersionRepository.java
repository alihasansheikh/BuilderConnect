package com.builderconnect.repository;

import com.builderconnect.entity.ContractVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractVersionRepository extends JpaRepository<ContractVersion, Long> {

    List<ContractVersion> findByContractIdOrderByVersionNumberDesc(Long contractId);

    @Query("SELECT COALESCE(MAX(cv.versionNumber), 0) FROM ContractVersion cv WHERE cv.contract.id = :contractId")
    int getMaxVersionNumber(@Param("contractId") Long contractId);
}
