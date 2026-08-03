package com.builderconnect.controller;

import com.builderconnect.dto.request.LoginRequest;
import com.builderconnect.dto.request.RegisterRequest;
import com.builderconnect.dto.response.AuthResponse;
import com.builderconnect.enums.UserRole;
import com.builderconnect.security.JwtTokenProvider;
import com.builderconnect.service.AuthService;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .email("test@example.com")
                .password("Password123!")
                .name("Test User")
                .phone("+923001234567")
                .role(UserRole.CLIENT)
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("Password123!")
                .build();

        AuthResponse.UserInfo userInfo = AuthResponse.UserInfo.builder()
                .id(1L)
                .email("test@example.com")
                .name("Test User")
                .role(UserRole.CLIENT)
                .emailVerified(true)
                .build();

        authResponse = AuthResponse.builder()
                .accessToken("test-access-token")
                .refreshToken("test-refresh-token")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .user(userInfo)
                .build();
    }

    @Test
    @DisplayName("Should register user successfully")
    @WithMockUser
    void register_WithValidData_ShouldReturnCreated() throws Exception {
        // Given
        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        // When/Then
        mockMvc.perform(post("/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("test-access-token"))
                .andExpect(jsonPath("$.user.email").value("test@example.com"));
    }

    @Test
    @DisplayName("Should reject registration with invalid email")
    @WithMockUser
    void register_WithInvalidEmail_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest invalidRequest = RegisterRequest.builder()
                .email("invalid-email")
                .password("Password123!")
                .name("Test User")
                .phone("+923001234567")
                .role(UserRole.CLIENT)
                .build();

        // When/Then
        mockMvc.perform(post("/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should login successfully")
    @WithMockUser
    void login_WithValidCredentials_ShouldReturnOk() throws Exception {
        // Given
        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        // When/Then
        mockMvc.perform(post("/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("test-access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("Should reject login with missing password")
    @WithMockUser
    void login_WithMissingPassword_ShouldReturnBadRequest() throws Exception {
        // Given
        LoginRequest invalidRequest = LoginRequest.builder()
                .email("test@example.com")
                .password(null)
                .build();

        // When/Then
        mockMvc.perform(post("/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should refresh token successfully")
    @WithMockUser
    void refreshToken_WithValidToken_ShouldReturnOk() throws Exception {
        // Given
        when(authService.refreshToken(any(String.class))).thenReturn(authResponse);

        // When/Then
        mockMvc.perform(post("/v1/auth/refresh")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"valid-refresh-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
    }
}
