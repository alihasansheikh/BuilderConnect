package com.builderconnect.repository;

import com.builderconnect.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {

    Optional<EmailTemplate> findByTemplateKey(String templateKey);

    List<EmailTemplate> findByIsActiveTrueOrderByNameAsc();

    boolean existsByTemplateKey(String templateKey);
}
