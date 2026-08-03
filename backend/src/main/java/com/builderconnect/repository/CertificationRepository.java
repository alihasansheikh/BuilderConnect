package com.builderconnect.repository;

import com.builderconnect.entity.Certification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificationRepository extends JpaRepository<Certification, Long> {

    List<Certification> findByUserIdOrderByIssueDateDesc(Long userId);

    Optional<Certification> findByIdAndUserId(Long id, Long userId);
}
