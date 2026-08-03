package com.builderconnect.repository;

import com.builderconnect.entity.ChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, Long> {

    List<ChangeRequest> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    long countByProjectIdAndStatus(Long projectId, ChangeRequest.ChangeRequestStatus status);
}
