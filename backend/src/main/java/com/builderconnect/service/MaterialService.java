package com.builderconnect.service;

import com.builderconnect.dto.request.MaterialCreateRequest;
import com.builderconnect.dto.request.MaterialUpdateRequest;
import com.builderconnect.dto.response.MaterialCategoryResponse;
import com.builderconnect.dto.response.MaterialResponse;
import com.builderconnect.entity.Material;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.MaterialCategoryRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.util.JsonUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for material catalog management (supplier CRUD + public browse).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MaterialService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final MaterialRepository materialRepository;
    private final MaterialCategoryRepository materialCategoryRepository;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    /**
     * Browse available materials (public). The sort key is server-built from the
     * whitelisted {@code sort} values — the client's Pageable sort is ignored.
     */
    @Transactional(readOnly = true)
    public Page<MaterialResponse> browseMaterials(String query, Long categoryId, Long supplierId,
                                                  BigDecimal minPrice, BigDecimal maxPrice,
                                                  Boolean inStock, String sort, Pageable pageable) {
        Sort sortOrder = resolveSort(sort);
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sortOrder);

        Page<Material> materials = materialRepository.findWithFilters(
                categoryId, supplierId, query, minPrice, maxPrice, inStock, sortedPageable);
        return materials.map(MaterialResponse::fromEntity);
    }

    /**
     * Get the top-level material categories (public, for browse filters).
     */
    @Transactional(readOnly = true)
    public List<MaterialCategoryResponse> getCategories() {
        return materialCategoryRepository.findByParentIdIsNullOrderBySortOrderAsc().stream()
                .map(MaterialCategoryResponse::fromEntity)
                .toList();
    }

    /**
     * Get a single material by ID.
     */
    @Transactional(readOnly = true)
    public MaterialResponse getMaterial(Long id) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + id));
        return MaterialResponse.fromEntity(material);
    }

    /**
     * Get supplier's own material catalog, optionally filtered by name/SKU search.
     */
    @Transactional(readOnly = true)
    public Page<MaterialResponse> getSupplierCatalog(User supplier, String search, Pageable pageable) {
        String searchTerm = (search == null || search.isBlank()) ? null : search.trim();
        return materialRepository.findBySupplierIdWithSearch(supplier.getId(), searchTerm, pageable)
                .map(MaterialResponse::fromEntity);
    }

    /**
     * Add a new material to the supplier's catalog.
     */
    @Transactional
    public MaterialResponse createMaterial(User supplier, MaterialCreateRequest request) {
        validateSupplierRole(supplier);

        if (request.getSku() == null || request.getSku().isBlank()) {
            throw new BadRequestException("SKU is required");
        }
        if (materialRepository.existsBySupplierIdAndSkuIgnoreCase(supplier.getId(), request.getSku())) {
            throw new IllegalStateException("SKU already exists in your catalog");
        }

        Material material = Material.builder()
                .supplier(supplier)
                .name(request.getName())
                .description(request.getDescription())
                .sku(request.getSku())
                .brand(request.getBrand())
                .unit(request.getUnit())
                .unitPrice(request.getUnitPrice())
                .minOrderQuantity(request.getMinOrderQuantity() != null ? request.getMinOrderQuantity() : 1)
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .categoryId(request.getCategoryId())
                .images(request.getImages())
                .specifications(request.getSpecifications())
                .build();

        material = materialRepository.save(material);

        auditService.logAction(supplier, "MATERIAL_CREATED", "MATERIAL", material.getId(),
                "Created material: " + material.getName());

        log.info("Material '{}' created by supplier {}", material.getName(), supplier.getId());

        return MaterialResponse.fromEntity(material);
    }

    /**
     * Update an existing material in the supplier's catalog.
     */
    @Transactional
    public MaterialResponse updateMaterial(User supplier, Long materialId, MaterialUpdateRequest request) {
        validateSupplierRole(supplier);

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        if (!material.getSupplier().getId().equals(supplier.getId())) {
            throw new UnauthorizedException("You can only update your own materials");
        }

        if (request.getSku() != null && !request.getSku().equalsIgnoreCase(material.getSku())
                && materialRepository.existsBySupplierIdAndSkuIgnoreCase(supplier.getId(), request.getSku())) {
            throw new IllegalStateException("SKU already exists in your catalog");
        }

        if (request.getName() != null) material.setName(request.getName());
        if (request.getDescription() != null) material.setDescription(request.getDescription());
        if (request.getSku() != null) material.setSku(request.getSku());
        if (request.getBrand() != null) material.setBrand(request.getBrand());
        if (request.getUnit() != null) material.setUnit(request.getUnit());
        if (request.getUnitPrice() != null) material.setUnitPrice(request.getUnitPrice());
        if (request.getMinOrderQuantity() != null) material.setMinOrderQuantity(request.getMinOrderQuantity());
        if (request.getStockQuantity() != null) material.setStockQuantity(request.getStockQuantity());
        if (request.getCategoryId() != null) material.setCategoryId(request.getCategoryId());
        if (request.getIsAvailable() != null) material.setIsAvailable(request.getIsAvailable());
        if (request.getIsFeatured() != null) material.setIsFeatured(request.getIsFeatured());
        if (request.getImages() != null) material.setImages(request.getImages());
        if (request.getSpecifications() != null) material.setSpecifications(request.getSpecifications());

        material = materialRepository.save(material);

        auditService.logAction(supplier, "MATERIAL_UPDATED", "MATERIAL", material.getId(),
                "Updated material: " + material.getName());

        log.info("Material '{}' (ID: {}) updated by supplier {}", material.getName(), materialId, supplier.getId());

        return MaterialResponse.fromEntity(material);
    }

    /**
     * Remove a material from the supplier's catalog (soft delete via isAvailable=false).
     */
    @Transactional
    public void deleteMaterial(User supplier, Long materialId) {
        validateSupplierRole(supplier);

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        if (!material.getSupplier().getId().equals(supplier.getId())) {
            throw new UnauthorizedException("You can only delete your own materials");
        }

        material.setIsAvailable(false);
        materialRepository.save(material);

        auditService.logAction(supplier, "MATERIAL_DELETED", "MATERIAL", material.getId(),
                "Removed material from catalog: " + material.getName());

        log.info("Material '{}' (ID: {}) removed by supplier {}", material.getName(), materialId, supplier.getId());
    }

    /**
     * Upload and attach a product image to a material (supplier, owner only).
     */
    @Transactional
    public MaterialResponse addMaterialImage(User supplier, Long materialId, MultipartFile file) {
        validateSupplierRole(supplier);

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        if (!material.getSupplier().getId().equals(supplier.getId())) {
            throw new UnauthorizedException("You can only manage images of your own materials");
        }

        String imageUrl = fileStorageService.storeMaterialImage(file, materialId);

        List<String> images = new ArrayList<>(JsonUtils.parseStringArray(material.getImages()));
        images.add(imageUrl);
        material.setImages(toJsonArray(images));

        if (material.getThumbnailUrl() == null || material.getThumbnailUrl().isBlank()) {
            material.setThumbnailUrl(images.get(0));
        }

        material = materialRepository.save(material);

        auditService.logAction(supplier, "MATERIAL_IMAGE_ADDED", "MATERIAL", material.getId(),
                "Added image to material: " + material.getName());

        log.info("Image added to material '{}' (ID: {}) by supplier {}", material.getName(), materialId, supplier.getId());

        return MaterialResponse.fromEntity(material);
    }

    /**
     * Remove a product image from a material (supplier, owner only).
     */
    @Transactional
    public MaterialResponse removeMaterialImage(User supplier, Long materialId, String imageUrl) {
        validateSupplierRole(supplier);

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        if (!material.getSupplier().getId().equals(supplier.getId())) {
            throw new UnauthorizedException("You can only manage images of your own materials");
        }

        List<String> images = new ArrayList<>(JsonUtils.parseStringArray(material.getImages()));
        if (!images.remove(imageUrl)) {
            throw new BadRequestException("Image not found on this material");
        }
        material.setImages(toJsonArray(images));

        // Reassign or clear the thumbnail when the removed image was it
        if (imageUrl.equals(material.getThumbnailUrl())) {
            material.setThumbnailUrl(images.isEmpty() ? null : images.get(0));
        }

        fileStorageService.deleteImage(imageUrl);

        material = materialRepository.save(material);

        auditService.logAction(supplier, "MATERIAL_IMAGE_REMOVED", "MATERIAL", material.getId(),
                "Removed image from material: " + material.getName());

        log.info("Image removed from material '{}' (ID: {}) by supplier {}", material.getName(), materialId, supplier.getId());

        return MaterialResponse.fromEntity(material);
    }

    private void validateSupplierRole(User user) {
        if (user.getRole() != UserRole.SUPPLIER) {
            throw new BadRequestException("Only suppliers can manage materials");
        }
    }

    /** Maps the whitelisted browse sort keys to a server-built Sort (default: newest first). */
    private Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        return switch (sort) {
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "unitPrice");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "unitPrice");
            case "rating" -> Sort.by(Sort.Direction.DESC, "averageRating");
            case "newest" -> Sort.by(Sort.Direction.DESC, "createdAt");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private String toJsonArray(List<String> values) {
        try {
            return OBJECT_MAPPER.writeValueAsString(values);
        } catch (Exception e) {
            throw new BadRequestException("Failed to serialize image list");
        }
    }
}
