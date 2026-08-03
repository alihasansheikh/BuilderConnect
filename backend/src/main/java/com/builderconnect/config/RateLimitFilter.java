package com.builderconnect.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-IP rate limiting filter with two tiers:
 * - AUTH tier (login, register, forgot/reset password): strict limit
 * - GENERAL tier (all other API endpoints): moderate limit
 *
 * Uses a fixed-window counter per IP address. A background cleanup task
 * evicts stale entries every 5 minutes to prevent unbounded map growth.
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final long CLEANUP_INTERVAL_MINUTES = 5L;
    private static final long STALE_THRESHOLD_MS = WINDOW_MS + (CLEANUP_INTERVAL_MINUTES * 60_000L);

    private static final Set<String> AUTH_PATHS = Set.of(
        "/v1/auth/login",
        "/v1/auth/register",
        "/v1/auth/forgot-password",
        "/v1/auth/reset-password"
    );

    // The public FAQ chatbot spends a metered (free-tier) LLM call per request,
    // so it gets its own stricter per-IP bucket.
    private static final String CHATBOT_PATH = "/v1/public/chatbot/ask";

    @Value("${app.rate-limit.auth-requests-per-minute:10}")
    private int authLimit;

    @Value("${app.rate-limit.general-requests-per-minute:100}")
    private int generalLimit;

    @Value("${app.rate-limit.chatbot-requests-per-minute:10}")
    private int chatbotLimit;

    /**
     * Comma-separated list of proxy addresses whose X-Forwarded-For header is trusted.
     * Defaults to loopback only (local dev / reverse proxy on the same host).
     * Direct connections from any other address use the socket address, so a
     * remote client cannot rotate identities by spoofing X-Forwarded-For.
     */
    @Value("${app.rate-limit.trusted-proxies:127.0.0.1,0:0:0:0:0:0:0:1,::1}")
    private String trustedProxies;

    private Set<String> trustedProxySet = Set.of();

    private final ConcurrentHashMap<String, RequestCounter> counters = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleanupExecutor;
    private final ObjectMapper objectMapper;

    public RateLimitFilter() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());

        this.cleanupExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "rate-limit-cleanup");
            t.setDaemon(true);
            return t;
        });
        this.cleanupExecutor.scheduleAtFixedRate(
            this::evictStaleEntries,
            CLEANUP_INTERVAL_MINUTES,
            CLEANUP_INTERVAL_MINUTES,
            TimeUnit.MINUTES
        );
    }

    @PostConstruct
    void initTrustedProxies() {
        if (trustedProxies == null || trustedProxies.isBlank()) {
            this.trustedProxySet = Set.of();
            return;
        }
        this.trustedProxySet = Arrays.stream(trustedProxies.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = extractClientIp(request);
        String path = request.getServletPath();
        boolean isChatbotPath = CHATBOT_PATH.equals(path);
        boolean isAuthPath = AUTH_PATHS.contains(path);
        String tier = isChatbotPath ? "chatbot" : (isAuthPath ? "auth" : "general");
        int limit = isChatbotPath ? chatbotLimit : (isAuthPath ? authLimit : generalLimit);

        String key = clientIp + ":" + tier;
        RequestCounter counter = counters.computeIfAbsent(key, k -> new RequestCounter());

        long now = System.currentTimeMillis();
        long windowStart = counter.windowStart;

        // Reset window if expired
        if (now - windowStart >= WINDOW_MS) {
            counter.count.set(0);
            counter.windowStart = now;
        }

        int currentCount = counter.count.incrementAndGet();

        if (currentCount > limit) {
            long retryAfterSeconds = Math.max(1,
                (WINDOW_MS - (now - counter.windowStart)) / 1000);

            log.warn("Rate limit exceeded for IP {} on {} path (count: {}, limit: {})",
                clientIp, tier, currentCount, limit);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));

            Map<String, Object> errorBody = Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 429,
                "error", "Too Many Requests",
                "message", "Rate limit exceeded. Please try again in " + retryAfterSeconds + " seconds.",
                "path", request.getRequestURI()
            );

            objectMapper.writeValue(response.getOutputStream(), errorBody);
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/ws") ||
               path.startsWith("/uploads") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/h2-console") ||
               path.equals("/error") ||
               // Stripe retries burst from few IPs; signature verification is the auth
               path.equals("/v1/webhooks/stripe");
    }

    private String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        // Only honor X-Forwarded-For when the direct peer is a trusted proxy;
        // otherwise the header is client-controlled and spoofable.
        if (!trustedProxySet.contains(remoteAddr)) {
            return remoteAddr;
        }
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            // Take the first IP (client IP) from the chain
            return xForwardedFor.split(",")[0].trim();
        }
        return remoteAddr;
    }

    private void evictStaleEntries() {
        long now = System.currentTimeMillis();
        counters.entrySet().removeIf(entry ->
            now - entry.getValue().windowStart > STALE_THRESHOLD_MS
        );
    }

    @PreDestroy
    public void shutdown() {
        cleanupExecutor.shutdownNow();
    }

    /**
     * Fixed-window request counter per IP.
     * Thread-safe via AtomicInteger for count and volatile for windowStart.
     */
    private static class RequestCounter {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long windowStart = System.currentTimeMillis();
    }
}
