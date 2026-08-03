package com.builderconnect.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitFilter filter;
    private FilterChain filterChain;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        filter = new RateLimitFilter();
        filterChain = mock(FilterChain.class);

        // Set limits via reflection (normally injected by Spring @Value)
        setField(filter, "authLimit", 10);
        setField(filter, "generalLimit", 100);
        setField(filter, "trustedProxies", "127.0.0.1");
        filter.initTrustedProxies();
    }

    @AfterEach
    void tearDown() {
        filter.shutdown();
    }

    @Test
    @DisplayName("Requests within general limit pass through")
    void generalRequests_withinLimit_passThrough() throws ServletException, IOException {
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = createRequest("/v1/projects", "192.168.1.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, filterChain);
            assertThat(response.getStatus()).isEqualTo(200);
        }
        verify(filterChain, times(5)).doFilter(any(), any());
    }

    @Test
    @DisplayName("Auth endpoint blocked after 10 requests")
    void authEndpoint_exceedsLimit_returns429() throws ServletException, IOException {
        String ip = "10.0.0.1";

        // First 10 requests pass
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = createRequest("/v1/auth/login", ip);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, filterChain);
            assertThat(response.getStatus()).isEqualTo(200);
        }

        // 11th request blocked
        MockHttpServletRequest request = createRequest("/v1/auth/login", ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(429);
        verify(filterChain, times(10)).doFilter(any(), any());
    }

    @Test
    @DisplayName("General endpoint blocked after 100 requests")
    void generalEndpoint_exceedsLimit_returns429() throws ServletException, IOException {
        String ip = "10.0.0.2";

        for (int i = 0; i < 100; i++) {
            MockHttpServletRequest request = createRequest("/v1/projects", ip);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, filterChain);
        }

        // 101st blocked
        MockHttpServletRequest request = createRequest("/v1/projects", ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    @DisplayName("429 response contains valid JSON body and Retry-After header")
    @SuppressWarnings("unchecked")
    void rateLimitResponse_hasCorrectFormat() throws Exception {
        String ip = "10.0.0.3";

        // Exhaust auth limit
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = createRequest("/v1/auth/login", ip);
            filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);
        }

        MockHttpServletRequest request = createRequest("/v1/auth/login", ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentType()).isEqualTo("application/json");
        assertThat(response.getHeader("Retry-After")).isNotNull();

        int retryAfter = Integer.parseInt(response.getHeader("Retry-After"));
        assertThat(retryAfter).isGreaterThan(0).isLessThanOrEqualTo(60);

        Map<String, Object> body = objectMapper.readValue(
            response.getContentAsString(), Map.class);
        assertThat(body.get("status")).isEqualTo(429);
        assertThat(body.get("error")).isEqualTo("Too Many Requests");
        assertThat(body.get("message")).asString().contains("Rate limit exceeded");
    }

    @Test
    @DisplayName("Different IPs are tracked independently")
    void differentIps_trackedIndependently() throws ServletException, IOException {
        // Exhaust limit for IP-A
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = createRequest("/v1/auth/login", "10.0.0.10");
            filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);
        }

        // IP-B should still pass
        MockHttpServletRequest request = createRequest("/v1/auth/login", "10.0.0.11");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Auth and general limits are independent for same IP")
    void authAndGeneral_independentCounters() throws ServletException, IOException {
        String ip = "10.0.0.20";

        // Exhaust auth limit
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = createRequest("/v1/auth/login", ip);
            filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);
        }

        // General endpoint should still work for same IP
        MockHttpServletRequest request = createRequest("/v1/projects", ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("shouldNotFilter skips WebSocket, uploads, Swagger, H2 console paths")
    void shouldNotFilter_skipsNonApiPaths() {
        assertThat(filter.shouldNotFilter(createRequest("/ws/info", "127.0.0.1"))).isTrue();
        assertThat(filter.shouldNotFilter(createRequest("/uploads/image.jpg", "127.0.0.1"))).isTrue();
        assertThat(filter.shouldNotFilter(createRequest("/swagger-ui/index.html", "127.0.0.1"))).isTrue();
        assertThat(filter.shouldNotFilter(createRequest("/v3/api-docs", "127.0.0.1"))).isTrue();
        assertThat(filter.shouldNotFilter(createRequest("/h2-console", "127.0.0.1"))).isTrue();
        assertThat(filter.shouldNotFilter(createRequest("/error", "127.0.0.1"))).isTrue();

        // API paths should be filtered
        assertThat(filter.shouldNotFilter(createRequest("/v1/projects", "127.0.0.1"))).isFalse();
        assertThat(filter.shouldNotFilter(createRequest("/v1/auth/login", "127.0.0.1"))).isFalse();
    }

    @Test
    @DisplayName("X-Forwarded-For is ignored when the direct peer is not a trusted proxy")
    void xForwardedFor_ignoredForUntrustedPeer() throws ServletException, IOException {
        // Untrusted remote peer exhausts its own (socket-address) counter
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = createRequest("/v1/auth/login", "203.0.113.99");
            request.addHeader("X-Forwarded-For", "10.10.10." + i); // spoofed rotation
            filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);
        }

        // Rotating X-Forwarded-For must NOT reset the limit — still blocked by remoteAddr
        MockHttpServletRequest blockedRequest = createRequest("/v1/auth/login", "203.0.113.99");
        blockedRequest.addHeader("X-Forwarded-For", "10.10.10.200");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(blockedRequest, response, filterChain);
        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    @DisplayName("X-Forwarded-For header is used for IP extraction behind a trusted proxy")
    void xForwardedFor_usedForIpExtraction() throws ServletException, IOException {
        // Exhaust limit using X-Forwarded-For IP (remoteAddr 127.0.0.1 is a trusted proxy)
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = createRequest("/v1/auth/login", "127.0.0.1");
            request.addHeader("X-Forwarded-For", "203.0.113.50, 70.41.3.18");
            filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);
        }

        // Same X-Forwarded-For IP should be blocked
        MockHttpServletRequest blockedRequest = createRequest("/v1/auth/login", "127.0.0.1");
        blockedRequest.addHeader("X-Forwarded-For", "203.0.113.50, 70.41.3.18");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(blockedRequest, response, filterChain);
        assertThat(response.getStatus()).isEqualTo(429);

        // Different X-Forwarded-For IP should pass (same remoteAddr)
        MockHttpServletRequest passRequest = createRequest("/v1/auth/login", "127.0.0.1");
        passRequest.addHeader("X-Forwarded-For", "198.51.100.1");
        MockHttpServletResponse passResponse = new MockHttpServletResponse();
        filter.doFilterInternal(passRequest, passResponse, filterChain);
        assertThat(passResponse.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("All auth paths are rate limited under auth tier")
    void allAuthPaths_rateLimitedUnderAuthTier() throws ServletException, IOException {
        String ip = "10.0.0.30";
        String[] authPaths = {
            "/v1/auth/login",
            "/v1/auth/register",
            "/v1/auth/forgot-password",
            "/v1/auth/reset-password"
        };

        // Each auth path should share its own counter
        for (String path : authPaths) {
            MockHttpServletRequest request = createRequest(path, ip);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, filterChain);
            assertThat(response.getStatus())
                .as("Auth path %s should pass", path)
                .isEqualTo(200);
        }
    }

    // --- Helpers ---

    private MockHttpServletRequest createRequest(String path, String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api" + path);
        request.setServletPath(path);
        request.setRemoteAddr(remoteAddr);
        return request;
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
