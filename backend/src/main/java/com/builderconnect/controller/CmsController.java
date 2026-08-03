package com.builderconnect.controller;

import com.builderconnect.entity.User;
import com.builderconnect.service.CmsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for CMS content management.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "CMS", description = "Content management endpoints")
public class CmsController {

    private final CmsService cmsService;

    // ========== Public Endpoints ==========

    @GetMapping("/v1/public/pages/{slug}")
    @Operation(summary = "Get a published page by slug")
    public ResponseEntity<Map<String, Object>> getPublicPage(@PathVariable String slug) {
        return ResponseEntity.ok(cmsService.getPublicPage(slug));
    }

    @GetMapping("/v1/public/blog")
    @Operation(summary = "Get published blog posts")
    public ResponseEntity<Page<Map<String, Object>>> getPublicBlogPosts(
            @RequestParam(required = false) String category,
            @PageableDefault(size = 10, sort = "publishedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(cmsService.getPublicBlogPosts(category, pageable));
    }

    @GetMapping("/v1/public/blog/{slug}")
    @Operation(summary = "Get a published blog post by slug")
    public ResponseEntity<Map<String, Object>> getPublicBlogPost(@PathVariable String slug) {
        return ResponseEntity.ok(cmsService.getPublicBlogPost(slug));
    }

    // ========== Admin CMS Pages ==========

    @GetMapping("/v1/admin/cms/pages")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get all CMS pages (admin)")
    public ResponseEntity<Page<Map<String, Object>>> getAllPages(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(cmsService.getAllPages(pageable));
    }

    @PostMapping("/v1/admin/cms/pages")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Create a CMS page")
    public ResponseEntity<Map<String, Object>> createPage(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(cmsService.createPage(admin,
                request.get("slug"), request.get("title"),
                request.get("content"), request.get("metaDescription")));
    }

    @PutMapping("/v1/admin/cms/pages/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update a CMS page")
    public ResponseEntity<Map<String, Object>> updatePage(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Boolean publish = request.containsKey("publish") ? (Boolean) request.get("publish") : null;
        return ResponseEntity.ok(cmsService.updatePage(admin, id,
                (String) request.get("title"), (String) request.get("content"),
                (String) request.get("metaDescription"), publish));
    }

    @DeleteMapping("/v1/admin/cms/pages/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a CMS page")
    public ResponseEntity<Void> deletePage(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id) {
        cmsService.deletePage(admin, id);
        return ResponseEntity.ok().build();
    }

    // ========== Admin Blog Posts ==========

    @GetMapping("/v1/admin/cms/blog")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get all blog posts (admin)")
    public ResponseEntity<Page<Map<String, Object>>> getAllBlogPosts(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(cmsService.getAllBlogPosts(pageable));
    }

    @PostMapping("/v1/admin/cms/blog")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Create a blog post")
    public ResponseEntity<Map<String, Object>> createBlogPost(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(cmsService.createBlogPost(admin,
                request.get("slug"), request.get("title"), request.get("excerpt"),
                request.get("content"), request.get("category"), request.get("coverImageUrl")));
    }

    @PutMapping("/v1/admin/cms/blog/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update a blog post")
    public ResponseEntity<Map<String, Object>> updateBlogPost(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Boolean publish = request.containsKey("publish") ? (Boolean) request.get("publish") : null;
        return ResponseEntity.ok(cmsService.updateBlogPost(admin, id,
                (String) request.get("title"), (String) request.get("excerpt"),
                (String) request.get("content"), (String) request.get("category"),
                (String) request.get("coverImageUrl"), publish));
    }

    @DeleteMapping("/v1/admin/cms/blog/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a blog post")
    public ResponseEntity<Void> deleteBlogPost(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id) {
        cmsService.deleteBlogPost(admin, id);
        return ResponseEntity.ok().build();
    }

    // ========== Admin Email Templates ==========

    @GetMapping("/v1/admin/cms/email-templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get all email templates")
    public ResponseEntity<List<Map<String, Object>>> getAllEmailTemplates() {
        return ResponseEntity.ok(cmsService.getAllEmailTemplates());
    }

    @PutMapping("/v1/admin/cms/email-templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update an email template")
    public ResponseEntity<Map<String, Object>> updateEmailTemplate(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Boolean isActive = request.containsKey("isActive") ? (Boolean) request.get("isActive") : null;
        return ResponseEntity.ok(cmsService.updateEmailTemplate(admin, id,
                (String) request.get("subject"), (String) request.get("body"), isActive));
    }
}
