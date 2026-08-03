package com.builderconnect.repository;

import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

/**
 * Repository for SupplierProfile entity operations.
 */
@Repository
public interface SupplierProfileRepository extends JpaRepository<SupplierProfile, Long> {

    Optional<SupplierProfile> findByUserId(Long userId);

    Page<SupplierProfile> findByIsVerifiedTrue(Pageable pageable);

    Page<SupplierProfile> findByIsVerifiedFalse(Pageable pageable);

    Page<SupplierProfile> findByVerificationStatus(VerificationStatus status, Pageable pageable);

    Page<SupplierProfile> findByIsVerifiedFalseAndVerificationStatusIn(
        Collection<VerificationStatus> statuses, Pageable pageable);

    long countByVerificationStatus(VerificationStatus status);
}
