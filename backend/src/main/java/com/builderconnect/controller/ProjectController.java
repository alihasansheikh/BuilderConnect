package com.builderconnect.controller;

import com.builderconnect.dto.request.ProjectCreateRequest;
import com.builderconnect.dto.response.ProjectResponse;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.ProjectAttachment;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.ProjectAttachmentRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.service.FileStorageService;
import com.builderconnect.service.ProjectService;
import com.builderconnect.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for project operations.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project management endpoints")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectRepository projectRepository;
    private final ProjectAttachmentRepository projectAttachmentRepository;
    private final FileStorageService fileStorageService;
    private final SystemSettingService systemSettingService;

    // ==================== CLIENT ENDPOINTS ====================

    @PostMapping("/client/projects")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Create a new project")
    public ResponseEntity<ProjectResponse> createProject(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ProjectCreateRequest request) {
        ProjectResponse response = projectService.createProject(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/client/projects/{id}/publish")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Publish a draft project")
    public ResponseEntity<ProjectResponse> publishProject(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        ProjectResponse response = projectService.publishProject(user, id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/client/projects")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Get client's projects")
    public ResponseEntity<Page<ProjectResponse>> getClientProjects(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) ProjectStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProjectResponse> projects = projectService.getClientProjects(user, status, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/client/projects/{id}")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Get project details for client")
    public ResponseEntity<ProjectResponse> getClientProject(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        ProjectResponse response = projectService.getClientProject(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/client/projects/{projectId}/award/{bidId}")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Award project to a bidder")
    public ResponseEntity<ProjectResponse> awardProject(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @PathVariable Long bidId) {
        ProjectResponse response = projectService.awardProject(user, projectId, bidId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/client/projects/{id}/cancel")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Cancel a project before work starts (reason required)")
    public ResponseEntity<ProjectResponse> cancelProject(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        ProjectResponse response = projectService.cancelProject(user, id, reason);
        return ResponseEntity.ok(response);
    }

    // ==================== PUBLIC / MARKETPLACE ENDPOINTS ====================

    @GetMapping("/projects")
    @Operation(summary = "Search open projects (marketplace)")
    public ResponseEntity<Page<ProjectResponse>> searchProjects(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String propertyType,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) BigDecimal minBudget,
            @RequestParam(required = false) BigDecimal maxBudget,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProjectResponse> projects = projectService.getOpenProjects(
            city, categoryId, propertyType, province, minBudget, maxBudget, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/projects/{id}")
    @Operation(summary = "Get project details")
    public ResponseEntity<ProjectResponse> getProject(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        ProjectResponse response = projectService.getProject(user, id);
        return ResponseEntity.ok(response);
    }

    // ==================== BUILDER ENDPOINTS ====================

    @GetMapping("/builder/projects")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Get builder's active projects")
    public ResponseEntity<Page<ProjectResponse>> getBuilderProjects(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) ProjectStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProjectResponse> projects = projectService.getBuilderProjects(user, status, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/categories")
    @Operation(summary = "Get all project categories (public)")
    public ResponseEntity<List<Map<String, Object>>> getCategories() {
        return ResponseEntity.ok(projectService.getCategories());
    }

    // ==================== PROJECT IMAGE ENDPOINTS ====================

    @PostMapping("/projects/{id}/images")
    @Operation(summary = "Upload an image to a project")
    public ResponseEntity<Map<String, Object>> uploadProjectImage(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));

        // Only project owner or awarded builder can upload images
        boolean isOwner = project.getClient().getId().equals(user.getId());
        boolean isBuilder = project.getAwardedBuilder() != null && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isOwner && !isBuilder) {
            throw new BadRequestException("Only the project owner or awarded builder can upload images");
        }

        int maxImages = systemSettingService.getInt(SystemSettingService.KEY_MAX_PROJECT_IMAGES, 20);
        if (projectAttachmentRepository.countByProjectId(id) >= maxImages) {
            throw new BadRequestException(
                    "This project already has the maximum of " + maxImages + " images");
        }

        String imageUrl = fileStorageService.storeProjectImage(file, id);

        ProjectAttachment attachment = ProjectAttachment.builder()
                .project(project)
                .uploadedBy(user)
                .fileName(file.getOriginalFilename())
                .fileUrl(imageUrl)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .attachmentType(ProjectAttachment.AttachmentType.PROGRESS)
                .build();

        ProjectAttachment saved = projectAttachmentRepository.save(attachment);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("fileName", saved.getFileName());
        response.put("fileUrl", saved.getFileUrl());
        response.put("fileType", saved.getFileType());
        response.put("fileSize", saved.getFileSize());
        response.put("createdAt", saved.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/projects/{id}/images")
    @Operation(summary = "Get all images for a project")
    public ResponseEntity<List<Map<String, Object>>> getProjectImages(@PathVariable Long id) {
        if (!projectRepository.existsById(id)) {
            throw new ResourceNotFoundException("Project not found: " + id);
        }

        List<ProjectAttachment> attachments = projectAttachmentRepository.findByProjectIdOrderByCreatedAtDesc(id);

        List<Map<String, Object>> images = attachments.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("fileName", a.getFileName());
            map.put("fileUrl", a.getFileUrl());
            map.put("fileType", a.getFileType());
            map.put("fileSize", a.getFileSize());
            map.put("attachmentType", a.getAttachmentType());
            map.put("uploadedBy", a.getUploadedBy() != null ? a.getUploadedBy().getName() : null);
            map.put("createdAt", a.getCreatedAt());
            return map;
        }).toList();

        return ResponseEntity.ok(images);
    }

    @DeleteMapping("/projects/{projectId}/images/{attachmentId}")
    @Operation(summary = "Delete a project image")
    public ResponseEntity<Map<String, String>> deleteProjectImage(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @PathVariable Long attachmentId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        // Only project owner can delete images
        if (!project.getClient().getId().equals(user.getId())) {
            throw new BadRequestException("Only the project owner can delete images");
        }

        ProjectAttachment attachment = projectAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found: " + attachmentId));

        if (!attachment.getProject().getId().equals(projectId)) {
            throw new BadRequestException("Image does not belong to this project");
        }

        fileStorageService.deleteImage(attachment.getFileUrl());
        projectAttachmentRepository.delete(attachment);

        return ResponseEntity.ok(Map.of("message", "Image deleted"));
    }

    // ==================== PROJECT DOCUMENT ENDPOINTS ====================

    @PostMapping("/projects/{id}/documents")
    @Operation(summary = "Upload a document to a project")
    public ResponseEntity<Map<String, Object>> uploadProjectDocument(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "attachmentType", defaultValue = "DESIGN") ProjectAttachment.AttachmentType type) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));

        // Only project owner or awarded builder can upload documents
        boolean isOwner = project.getClient().getId().equals(user.getId());
        boolean isBuilder = project.getAwardedBuilder() != null && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isOwner && !isBuilder) {
            throw new BadRequestException("Only the project owner or awarded builder can upload documents");
        }

        String documentUrl = fileStorageService.storeProjectDocument(file, id);

        ProjectAttachment attachment = ProjectAttachment.builder()
                .project(project)
                .uploadedBy(user)
                .fileName(file.getOriginalFilename())
                .fileUrl(documentUrl)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .attachmentType(type)
                .build();

        ProjectAttachment saved = projectAttachmentRepository.save(attachment);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("fileName", saved.getFileName());
        response.put("fileUrl", saved.getFileUrl());
        response.put("fileType", saved.getFileType());
        response.put("fileSize", saved.getFileSize());
        response.put("attachmentType", saved.getAttachmentType());
        response.put("createdAt", saved.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
