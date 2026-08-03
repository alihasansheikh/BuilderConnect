package com.builderconnect.service;

import com.builderconnect.entity.BlogPost;
import com.builderconnect.entity.CmsPage;
import com.builderconnect.entity.EmailTemplate;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BlogPostRepository;
import com.builderconnect.repository.CmsPageRepository;
import com.builderconnect.repository.EmailTemplateRepository;
import com.builderconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Service for CMS content management (pages, blog posts, email templates).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CmsService {

    private final CmsPageRepository cmsPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final EmailTemplateRepository emailTemplateRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ========== CMS Pages ==========

    @Transactional
    public Map<String, Object> createPage(User admin, String slug, String title, String content, String metaDescription) {
        if (cmsPageRepository.existsBySlug(slug)) {
            throw new BadRequestException("Page with slug '" + slug + "' already exists");
        }

        CmsPage page = CmsPage.builder()
                .slug(slug)
                .title(title)
                .content(content)
                .metaDescription(metaDescription)
                .createdBy(admin.getId())
                .build();

        page = cmsPageRepository.save(page);

        auditService.logAction(admin, "CMS_PAGE_CREATED", "CMS_PAGE", page.getId(),
                "Created CMS page: " + title);
        log.info("Admin {} created CMS page '{}'", admin.getEmail(), slug);

        return pageToMap(page);
    }

    @Transactional
    public Map<String, Object> updatePage(User admin, Long id, String title, String content,
                                           String metaDescription, Boolean publish) {
        CmsPage page = cmsPageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + id));

        if (title != null) page.setTitle(title);
        if (content != null) page.setContent(content);
        if (metaDescription != null) page.setMetaDescription(metaDescription);
        page.setUpdatedBy(admin.getId());

        if (Boolean.TRUE.equals(publish)) {
            page.publish();
        } else if (Boolean.FALSE.equals(publish)) {
            page.unpublish();
        }

        cmsPageRepository.save(page);
        log.info("Admin {} updated CMS page '{}'", admin.getEmail(), page.getSlug());

        return pageToMap(page);
    }

    @Transactional
    public void deletePage(User admin, Long id) {
        CmsPage page = cmsPageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + id));

        cmsPageRepository.delete(page);

        auditService.logAction(admin, "CMS_PAGE_DELETED", "CMS_PAGE", id,
                "Deleted CMS page: " + page.getTitle());
        log.info("Admin {} deleted CMS page '{}'", admin.getEmail(), page.getSlug());
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllPages(Pageable pageable) {
        return cmsPageRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::pageToMap);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPublicPage(String slug) {
        CmsPage page = cmsPageRepository.findBySlugAndIsPublishedTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + slug));
        return pageToMap(page);
    }

    // ========== Blog Posts ==========

    @Transactional
    public Map<String, Object> createBlogPost(User admin, String slug, String title, String excerpt,
                                               String content, String category, String coverImageUrl) {
        if (blogPostRepository.existsBySlug(slug)) {
            throw new BadRequestException("Blog post with slug '" + slug + "' already exists");
        }

        BlogPost post = BlogPost.builder()
                .slug(slug)
                .title(title)
                .excerpt(excerpt)
                .content(content)
                .category(category)
                .coverImageUrl(coverImageUrl)
                .createdBy(admin.getId())
                .build();

        post = blogPostRepository.save(post);

        auditService.logAction(admin, "BLOG_POST_CREATED", "BLOG_POST", post.getId(),
                "Created blog post: " + title);
        log.info("Admin {} created blog post '{}'", admin.getEmail(), slug);

        return postToMap(post);
    }

    @Transactional
    public Map<String, Object> updateBlogPost(User admin, Long id, String title, String excerpt,
                                               String content, String category, String coverImageUrl,
                                               Boolean publish) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog post not found: " + id));

        if (title != null) post.setTitle(title);
        if (excerpt != null) post.setExcerpt(excerpt);
        if (content != null) post.setContent(content);
        if (category != null) post.setCategory(category);
        if (coverImageUrl != null) post.setCoverImageUrl(coverImageUrl);
        post.setUpdatedBy(admin.getId());

        if (Boolean.TRUE.equals(publish)) {
            post.publish();
        } else if (Boolean.FALSE.equals(publish)) {
            post.unpublish();
        }

        blogPostRepository.save(post);
        log.info("Admin {} updated blog post '{}'", admin.getEmail(), post.getSlug());

        return postToMap(post);
    }

    @Transactional
    public void deleteBlogPost(User admin, Long id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog post not found: " + id));

        blogPostRepository.delete(post);

        auditService.logAction(admin, "BLOG_POST_DELETED", "BLOG_POST", id,
                "Deleted blog post: " + post.getTitle());
        log.info("Admin {} deleted blog post '{}'", admin.getEmail(), post.getSlug());
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllBlogPosts(Pageable pageable) {
        return mapWithAuthors(blogPostRepository.findAllByOrderByCreatedAtDesc(pageable));
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getPublicBlogPosts(String category, Pageable pageable) {
        if (category != null && !category.isBlank()) {
            return mapWithAuthors(
                    blogPostRepository.findByCategoryAndIsPublishedTrueOrderByPublishedAtDesc(category, pageable));
        }
        return mapWithAuthors(blogPostRepository.findByIsPublishedTrueOrderByPublishedAtDesc(pageable));
    }

    @Transactional
    public Map<String, Object> getPublicBlogPost(String slug) {
        BlogPost post = blogPostRepository.findBySlugAndIsPublishedTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Blog post not found: " + slug));
        post.setViewCount(post.getViewCount() == null ? 1 : post.getViewCount() + 1);
        post = blogPostRepository.save(post);
        return postToMap(post);
    }

    // ========== Email Templates ==========

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllEmailTemplates() {
        return emailTemplateRepository.findAll().stream()
                .map(this::templateToMap)
                .toList();
    }

    @Transactional
    public Map<String, Object> updateEmailTemplate(User admin, Long id, String subject, String body, Boolean isActive) {
        EmailTemplate template = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Email template not found: " + id));

        if (subject != null) template.setSubject(subject);
        if (body != null) template.setBody(body);
        if (isActive != null) template.setIsActive(isActive);
        template.setUpdatedBy(admin.getId());

        emailTemplateRepository.save(template);

        auditService.logAction(admin, "EMAIL_TEMPLATE_UPDATED", "EMAIL_TEMPLATE", id,
                "Updated email template: " + template.getName());
        log.info("Admin {} updated email template '{}'", admin.getEmail(), template.getTemplateKey());

        return templateToMap(template);
    }

    // ========== Mappers ==========

    private Map<String, Object> pageToMap(CmsPage page) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", page.getId());
        map.put("slug", page.getSlug());
        map.put("title", page.getTitle());
        map.put("content", page.getContent());
        map.put("metaDescription", page.getMetaDescription());
        map.put("status", page.getStatus());
        map.put("isPublished", page.getIsPublished());
        map.put("publishedAt", page.getPublishedAt());
        map.put("createdAt", page.getCreatedAt());
        map.put("updatedAt", page.getUpdatedAt());
        return map;
    }

    private Page<Map<String, Object>> mapWithAuthors(Page<BlogPost> posts) {
        Map<Long, String> authorNames = resolveAuthorNames(posts.getContent());
        return posts.map(post -> postToMap(post, authorNames));
    }

    private Map<Long, String> resolveAuthorNames(List<BlogPost> posts) {
        List<Long> authorIds = posts.stream()
                .map(BlogPost::getCreatedBy)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (authorIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
    }

    private Map<String, Object> postToMap(BlogPost post) {
        return postToMap(post, resolveAuthorNames(List.of(post)));
    }

    private Map<String, Object> postToMap(BlogPost post, Map<Long, String> authorNames) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", post.getId());
        map.put("slug", post.getSlug());
        map.put("title", post.getTitle());
        map.put("excerpt", post.getExcerpt());
        map.put("content", post.getContent());
        map.put("coverImageUrl", post.getCoverImageUrl());
        map.put("category", post.getCategory());
        map.put("tags", post.getTags());
        map.put("status", post.getStatus());
        map.put("isPublished", post.getIsPublished());
        map.put("publishedAt", post.getPublishedAt());
        map.put("viewCount", post.getViewCount());
        map.put("authorName", post.getCreatedBy() == null ? null : authorNames.get(post.getCreatedBy()));
        map.put("createdAt", post.getCreatedAt());
        map.put("updatedAt", post.getUpdatedAt());
        return map;
    }

    private Map<String, Object> templateToMap(EmailTemplate template) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", template.getId());
        map.put("templateKey", template.getTemplateKey());
        map.put("name", template.getName());
        map.put("subject", template.getSubject());
        map.put("body", template.getBody());
        map.put("variables", template.getVariables());
        map.put("isActive", template.getIsActive());
        map.put("createdAt", template.getCreatedAt());
        map.put("updatedAt", template.getUpdatedAt());
        return map;
    }
}
