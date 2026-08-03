package com.builderconnect.service;

import com.builderconnect.dto.response.LeadTransactionResponse;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.LeadTransaction;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.LeadTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for managing builder lead credits.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final BuilderProfileRepository builderProfileRepository;
    private final LeadTransactionRepository leadTransactionRepository;

    /**
     * Verify that a builder has sufficient lead credits before creating a bid.
     * Call this before saving the bid to fail fast.
     */
    @Transactional(readOnly = true)
    public void verifyLeadCredits(User builder) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        if (!profile.hasLeadCredits()) {
            throw new BadRequestException("Insufficient lead credits. Upgrade or renew your subscription to get more credits.");
        }
    }

    /**
     * Consume one lead credit when builder submits a bid.
     */
    @Transactional
    public void consumeLeadCredit(User builder, Long bidId, String projectTitle) {
        BuilderProfile profile = builderProfileRepository.findByUserIdForUpdate(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        if (!profile.hasLeadCredits()) {
            throw new BadRequestException("Insufficient lead credits. Upgrade or renew your subscription to get more credits.");
        }

        int previousBalance = profile.getLeadCredits();
        profile.useLeadCredit();
        builderProfileRepository.save(profile);

        // Record the transaction
        LeadTransaction tx = LeadTransaction.builder()
                .builderProfile(profile)
                .transactionType(LeadTransaction.TransactionType.DEBIT)
                .amount(1)
                .balanceAfter(profile.getLeadCredits())
                .referenceType("BID")
                .referenceId(bidId)
                .description("Lead credit used for bid on project: " + projectTitle)
                .build();
        leadTransactionRepository.save(tx);

        log.info("Lead credit consumed for builder {} (bid {}). Balance: {} -> {}",
                builder.getId(), bidId, previousBalance, profile.getLeadCredits());
    }

    /**
     * Get current lead credit balance for a builder.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getLeadCreditBalance(User builder) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        Map<String, Object> result = new HashMap<>();
        result.put("credits", profile.getLeadCredits());
        result.put("subscriptionTier", profile.getSubscriptionTier());
        return result;
    }

    /**
     * Get lead transaction history for a builder.
     */
    @Transactional(readOnly = true)
    public Page<LeadTransactionResponse> getLeadTransactions(User builder, Pageable pageable) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        return leadTransactionRepository
                .findByBuilderProfileIdOrderByCreatedAtDesc(profile.getId(), pageable)
                .map(LeadTransactionResponse::fromEntity);
    }

    /**
     * Add lead credits (purchase or bonus).
     */
    @Transactional
    public void addLeadCredits(User builder, int amount, LeadTransaction.TransactionType type, String description) {
        BuilderProfile profile = builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        profile.setLeadCredits(profile.getLeadCredits() + amount);
        builderProfileRepository.save(profile);

        LeadTransaction tx = LeadTransaction.builder()
                .builderProfile(profile)
                .transactionType(type)
                .amount(amount)
                .balanceAfter(profile.getLeadCredits())
                .description(description)
                .build();
        leadTransactionRepository.save(tx);

        log.info("Added {} lead credits for builder {}. New balance: {}",
                amount, builder.getId(), profile.getLeadCredits());
    }
}
