package com.builderconnect.service;

import com.builderconnect.dto.request.PortfolioItemRequest;
import com.builderconnect.dto.response.PortfolioItemResponse;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.PortfolioItem;
import com.builderconnect.entity.SubscriptionPlan;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.PortfolioItemRepository;
import com.builderconnect.util.JsonUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Business logic for builder portfolio items on the profile page.
 * Owner-scoped mutations; reads are open to any authenticated viewer.
 * The total image count across all items is capped by the builder's
 * effective subscription tier (maxPortfolioImages).
 */
@Service
public class PortfolioService {

    private final PortfolioItemRepository portfolioItemRepository;
    private final FileStorageService fileStorageService;
    private final BuilderProfileRepository builderProfileRepository;
    private final SubscriptionService subscriptionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PortfolioService(PortfolioItemRepository portfolioItemRepository,
                            FileStorageService fileStorageService,
                            BuilderProfileRepository builderProfileRepository,
                            SubscriptionService subscriptionService) {
        this.portfolioItemRepository = portfolioItemRepository;
        this.fileStorageService = fileStorageService;
        this.builderProfileRepository = builderProfileRepository;
        this.subscriptionService = subscriptionService;
    }

    @Transactional(readOnly = true)
    public List<PortfolioItemResponse> getUserPortfolio(Long userId) {
        return portfolioItemRepository
                .findByUserIdOrderByDisplayOrderAscCreatedAtDesc(userId)
                .stream()
                .map(PortfolioItemResponse::fromEntity)
                .toList();
    }

    @Transactional
    public PortfolioItemResponse create(User builder, PortfolioItemRequest request) {
        enforceImageLimit(builder, imageCount(request.getImages()), null);
        PortfolioItem item = PortfolioItem.builder()
                .userId(builder.getId())
                .title(request.getTitle())
                .description(request.getDescription())
                .images(writeImages(request.getImages()))
                .projectCost(request.getProjectCost())
                .durationDays(request.getDurationDays())
                .year(request.getYear())
                .externalUrl(request.getExternalUrl())
                .displayOrder(0)
                .build();
        return PortfolioItemResponse.fromEntity(portfolioItemRepository.save(item));
    }

    @Transactional
    public PortfolioItemResponse update(User builder, Long id, PortfolioItemRequest request) {
        PortfolioItem item = findOwned(id, builder.getId());
        enforceImageLimit(builder, imageCount(request.getImages()), id);
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setImages(writeImages(request.getImages()));
        item.setProjectCost(request.getProjectCost());
        item.setDurationDays(request.getDurationDays());
        item.setYear(request.getYear());
        item.setExternalUrl(request.getExternalUrl());
        return PortfolioItemResponse.fromEntity(portfolioItemRepository.save(item));
    }

    @Transactional
    public void delete(User builder, Long id) {
        PortfolioItem item = findOwned(id, builder.getId());
        portfolioItemRepository.delete(item);
    }

    public String uploadImage(User builder, MultipartFile file) {
        // Cheap pre-check so users fail BEFORE uploading bytes; create/update stays authoritative
        BuilderProfile profile = profileOf(builder);
        SubscriptionPlan plan = subscriptionService.getEffectivePlan(profile);
        if (countExistingImages(builder.getId(), null) >= plan.getMaxPortfolioImages()) {
            throw new BadRequestException(imageLimitMessage(profile, plan));
        }
        return fileStorageService.storePortfolioImage(file, builder.getId());
    }

    private PortfolioItem findOwned(Long id, Long userId) {
        return portfolioItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio item not found"));
    }

    /**
     * Subscription plan limit: total images across ALL portfolio items may not exceed
     * the effective tier's maxPortfolioImages (expired paid tier counts as FREE).
     * {@code excludeItemId} skips the item being updated so its replaced images don't
     * double-count.
     */
    private void enforceImageLimit(User builder, int imagesBeingSaved, Long excludeItemId) {
        BuilderProfile profile = profileOf(builder);
        SubscriptionPlan plan = subscriptionService.getEffectivePlan(profile);
        int existingTotal = countExistingImages(builder.getId(), excludeItemId);
        if (existingTotal + imagesBeingSaved > plan.getMaxPortfolioImages()) {
            throw new BadRequestException(imageLimitMessage(profile, plan));
        }
    }

    private BuilderProfile profileOf(User builder) {
        return builderProfileRepository.findByUserId(builder.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));
    }

    private int countExistingImages(Long userId, Long excludeItemId) {
        return portfolioItemRepository.findByUserIdOrderByDisplayOrderAscCreatedAtDesc(userId)
                .stream()
                .filter(item -> excludeItemId == null || !item.getId().equals(excludeItemId))
                .mapToInt(item -> JsonUtils.parseStringArray(item.getImages()).size())
                .sum();
    }

    private int imageCount(List<String> images) {
        return images == null ? 0 : images.size();
    }

    private String imageLimitMessage(BuilderProfile profile, SubscriptionPlan plan) {
        return "Your " + profile.getEffectiveTier() + " plan allows up to "
                + plan.getMaxPortfolioImages()
                + " portfolio images. Upgrade to showcase more work.";
    }

    private String writeImages(List<String> images) {
        try {
            return objectMapper.writeValueAsString(images == null ? List.of() : images);
        } catch (JsonProcessingException e) {
            // Fall back to an empty JSON array rather than failing the write on a serialization edge case.
            return "[]";
        }
    }
}
