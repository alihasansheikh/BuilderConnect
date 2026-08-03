package com.builderconnect.controller;

import com.builderconnect.dto.request.MaterialCreateRequest;
import com.builderconnect.dto.request.MaterialUpdateRequest;
import com.builderconnect.dto.response.MaterialCategoryResponse;
import com.builderconnect.dto.response.MaterialResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.MaterialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

/**
 * Controller for material catalog management.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Materials", description = "Material catalog endpoints")
public class MaterialController {

    private final MaterialService materialService;

    @GetMapping("/materials")
    @Operation(summary = "Browse available materials (public)")
    public ResponseEntity<Page<MaterialResponse>> browseMaterials(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) String sort,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<MaterialResponse> materials = materialService.browseMaterials(
                query, categoryId, supplierId, minPrice, maxPrice, inStock, sort, pageable);
        return ResponseEntity.ok(materials);
    }

    @GetMapping("/materials/categories")
    @Operation(summary = "Get top-level material categories (public)")
    public ResponseEntity<List<MaterialCategoryResponse>> getCategories() {

        List<MaterialCategoryResponse> categories = materialService.getCategories();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/materials/{id}")
    @Operation(summary = "Get material detail")
    public ResponseEntity<MaterialResponse> getMaterial(@PathVariable Long id) {

        MaterialResponse response = materialService.getMaterial(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/supplier/materials")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Get supplier's own material catalog")
    public ResponseEntity<Page<MaterialResponse>> getSupplierCatalog(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<MaterialResponse> materials = materialService.getSupplierCatalog(user, search, pageable);
        return ResponseEntity.ok(materials);
    }

    @PostMapping("/supplier/materials")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Add a material to the supplier's catalog")
    public ResponseEntity<MaterialResponse> createMaterial(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MaterialCreateRequest request) {

        MaterialResponse response = materialService.createMaterial(user, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/supplier/materials/{id}")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Update a material in the supplier's catalog")
    public ResponseEntity<MaterialResponse> updateMaterial(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody MaterialUpdateRequest request) {

        MaterialResponse response = materialService.updateMaterial(user, id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/supplier/materials/{id}/images")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Upload a product image for a material")
    public ResponseEntity<MaterialResponse> addMaterialImage(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        MaterialResponse response = materialService.addMaterialImage(user, id, file);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/supplier/materials/{id}/images")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Remove a product image from a material")
    public ResponseEntity<MaterialResponse> removeMaterialImage(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam("url") String imageUrl) {

        MaterialResponse response = materialService.removeMaterialImage(user, id, imageUrl);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/supplier/materials/{id}")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Remove a material from the supplier's catalog")
    public ResponseEntity<Void> deleteMaterial(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        materialService.deleteMaterial(user, id);
        return ResponseEntity.noContent().build();
    }
}
