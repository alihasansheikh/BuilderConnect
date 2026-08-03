package com.builderconnect.service;

import com.builderconnect.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif");
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of("image/jpeg", "image/png", "image/gif");
    private static final Set<String> ALLOWED_DOCUMENT_EXTENSIONS = Set.of("pdf", "doc", "docx");
    private static final Set<String> ALLOWED_DOCUMENT_MIME_TYPES = Set.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    // Payment proof: image OR pdf (off-platform receipt evidence)
    private static final Set<String> ALLOWED_PROOF_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "pdf");
    private static final Set<String> ALLOWED_PROOF_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "application/pdf"
    );
    // Certification document: image OR pdf (credential scan / certificate)
    private static final Set<String> ALLOWED_CERT_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "pdf");
    private static final Set<String> ALLOWED_CERT_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "application/pdf"
    );

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.upload.max-size:10485760}")
    private long maxFileSize;

    private Path profilesDir;
    private Path bannersDir;
    private Path projectsDir;
    private Path documentsDir;
    private Path proofsDir;
    private Path portfolioDir;
    private Path certificationsDir;
    private Path materialsDir;
    private Path verificationDir;

    @PostConstruct
    public void init() {
        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        profilesDir = base.resolve("profiles");
        bannersDir = base.resolve("banners");
        projectsDir = base.resolve("projects");
        documentsDir = base.resolve("documents");
        proofsDir = base.resolve("proofs");
        portfolioDir = base.resolve("portfolio");
        certificationsDir = base.resolve("certifications");
        materialsDir = base.resolve("materials");
        verificationDir = base.resolve("verification");
        try {
            Files.createDirectories(profilesDir);
            Files.createDirectories(bannersDir);
            Files.createDirectories(projectsDir);
            Files.createDirectories(documentsDir);
            Files.createDirectories(proofsDir);
            Files.createDirectories(portfolioDir);
            Files.createDirectories(certificationsDir);
            Files.createDirectories(materialsDir);
            Files.createDirectories(verificationDir);
            log.info("Upload directories initialized under: {}", base);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directories", e);
        }
    }

    public String storeProfileImage(MultipartFile file, Long userId) {
        return storeFile(file, profilesDir, "profile_" + userId, "/uploads/profiles/",
                ALLOWED_IMAGE_EXTENSIONS, ALLOWED_MIME_TYPES);
    }

    public String storeBannerImage(MultipartFile file, Long profileId) {
        return storeFile(file, bannersDir, "banner_" + profileId, "/uploads/banners/",
                ALLOWED_IMAGE_EXTENSIONS, ALLOWED_MIME_TYPES);
    }

    public String storeProjectImage(MultipartFile file, Long projectId) {
        return storeFile(file, projectsDir, "project_" + projectId, "/uploads/projects/",
                ALLOWED_IMAGE_EXTENSIONS, ALLOWED_MIME_TYPES);
    }

    public String storeProjectDocument(MultipartFile file, Long projectId) {
        return storeFile(file, documentsDir, "project_doc_" + projectId, "/uploads/documents/",
                ALLOWED_DOCUMENT_EXTENSIONS, ALLOWED_DOCUMENT_MIME_TYPES);
    }

    /**
     * Stores a portfolio showcase image (jpg/jpeg/png/gif, capped at the configured max size)
     * under ./uploads/portfolio/ and returns its public relative URL.
     */
    public String storePortfolioImage(MultipartFile file, Long userId) {
        return storeFile(file, portfolioDir, "portfolio_" + userId, "/uploads/portfolio/",
                ALLOWED_IMAGE_EXTENSIONS, ALLOWED_MIME_TYPES);
    }

    /**
     * Stores a material catalog image (jpg/jpeg/png/gif, capped at the configured max size)
     * under ./uploads/materials/ and returns its public relative URL.
     */
    public String storeMaterialImage(MultipartFile file, Long materialId) {
        return storeFile(file, materialsDir, "material_" + materialId, "/uploads/materials/",
                ALLOWED_IMAGE_EXTENSIONS, ALLOWED_MIME_TYPES);
    }

    /**
     * Stores a certification document — image (jpg/jpeg/png/gif) or PDF, capped at the configured
     * max size — under ./uploads/certifications/ and returns its public relative URL.
     */
    public String storeCertificationDocument(MultipartFile file, Long userId) {
        return storeFile(file, certificationsDir, "cert_" + userId, "/uploads/certifications/",
                ALLOWED_CERT_EXTENSIONS, ALLOWED_CERT_MIME_TYPES);
    }

    /**
     * Stores a verification request document — image (jpg/jpeg/png/gif) or PDF, capped at the
     * configured max size — under ./uploads/verification/ and returns its public relative URL.
     */
    public String storeVerificationDocument(MultipartFile file, Long userId) {
        return storeFile(file, verificationDir, "verification_" + userId, "/uploads/verification/",
                ALLOWED_CERT_EXTENSIONS, ALLOWED_CERT_MIME_TYPES);
    }

    /**
     * Stores off-platform payment proof for a milestone. Accepts images (jpg/jpeg/png/gif) or PDF,
     * capped at the configured max size, under ./uploads/proofs/.
     */
    public String storePaymentProof(MultipartFile file, Long milestoneId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Payment proof is required");
        }
        if (file.getSize() > maxFileSize) {
            throw new BadRequestException("File size exceeds maximum limit of 10MB");
        }

        String original = file.getOriginalFilename();
        String extension = (original != null && original.contains("."))
            ? original.substring(original.lastIndexOf('.') + 1)
            : "";
        String contentType = file.getContentType();
        boolean okExtension = ALLOWED_PROOF_EXTENSIONS.contains(extension.toLowerCase());
        boolean okMimeType = contentType != null && ALLOWED_PROOF_MIME_TYPES.contains(contentType.toLowerCase());
        if (!okExtension || !okMimeType) {
            throw new BadRequestException("Proof must be an image or PDF");
        }

        String filename = "proof_" + milestoneId + "_" + UUID.randomUUID() + "." + extension;
        Path targetPath = proofsDir.resolve(filename).normalize();

        // Path traversal protection
        if (!targetPath.startsWith(proofsDir)) {
            throw new BadRequestException("Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored payment proof: {}", targetPath);
            return "/uploads/proofs/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store payment proof", e);
        }
    }

    private String storeFile(MultipartFile file, Path directory, String prefix, String urlBase,
                             Set<String> allowedExtensions, Set<String> allowedMimeTypes) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new BadRequestException("File size exceeds maximum limit of 10MB");
        }

        String extension = getFileExtension(file.getOriginalFilename());

        if (!allowedExtensions.contains(extension.toLowerCase())) {
            throw new BadRequestException("File type not allowed. Allowed extensions: " + allowedExtensions);
        }

        String contentType = file.getContentType();
        if (contentType == null || !allowedMimeTypes.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Invalid file type. Allowed types: " + allowedMimeTypes);
        }

        String filename = prefix + "_" + UUID.randomUUID() + "." + extension;
        Path targetPath = directory.resolve(filename).normalize();

        // Path traversal protection
        if (!targetPath.startsWith(directory)) {
            throw new BadRequestException("Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored file: {}", targetPath);
            return urlBase + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public void deleteImage(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }

        try {
            Path basePath = Paths.get(uploadDir).toAbsolutePath().normalize();
            String cleanPath = relativePath.startsWith("/uploads/")
                    ? relativePath.substring("/uploads/".length())
                    : relativePath;
            Path filePath = basePath.resolve(cleanPath).normalize();

            // Path traversal protection
            if (!filePath.startsWith(basePath)) {
                log.warn("Attempted path traversal in deleteImage: {}", relativePath);
                return;
            }

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted image: {}", filePath);
            }
        } catch (IOException e) {
            log.error("Failed to delete image: {}", relativePath, e);
        }
    }

    // Keep backward-compatible aliases
    public void deleteProfileImage(String relativePath) {
        deleteImage(relativePath);
    }

    public void deleteOldProfileImage(String oldImageUrl) {
        if (oldImageUrl != null && !oldImageUrl.isBlank()) {
            deleteImage(oldImageUrl);
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new BadRequestException("File must have an extension");
        }
        return filename.substring(filename.lastIndexOf('.') + 1);
    }
}
