package com.builderconnect.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    @Test
    @DisplayName("Valid secret (>=32 chars) initializes successfully")
    void init_validSecret_succeeds() throws Exception {
        JwtTokenProvider provider = createProvider(
            "ThisIsAValidSecretKeyThatIsAtLeast32Characters!");

        provider.init();

        // No exception means success — secretKey should be set
        assertThat(getField(provider, "secretKey")).isNotNull();
    }

    @Test
    @DisplayName("Exactly 32 character secret initializes successfully")
    void init_exactly32Chars_succeeds() throws Exception {
        JwtTokenProvider provider = createProvider(
            "12345678901234567890123456789012"); // exactly 32

        provider.init();

        assertThat(getField(provider, "secretKey")).isNotNull();
    }

    @Test
    @DisplayName("Short secret (<32 chars) throws IllegalStateException")
    void init_shortSecret_throwsIllegalState() throws Exception {
        JwtTokenProvider provider = createProvider("tooshort");

        assertThatThrownBy(provider::init)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("at least 32 characters");
    }

    @Test
    @DisplayName("Blank secret throws IllegalStateException")
    void init_blankSecret_throwsIllegalState() throws Exception {
        JwtTokenProvider provider = createProvider("   ");

        assertThatThrownBy(provider::init)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Empty secret throws IllegalStateException")
    void init_emptySecret_throwsIllegalState() throws Exception {
        JwtTokenProvider provider = createProvider("");

        assertThatThrownBy(provider::init)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Null secret throws IllegalStateException")
    void init_nullSecret_throwsIllegalState() throws Exception {
        JwtTokenProvider provider = createProvider(null);

        assertThatThrownBy(provider::init)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Dev profile secret (76 chars) initializes successfully")
    void init_devProfileSecret_succeeds() throws Exception {
        JwtTokenProvider provider = createProvider(
            "DevOnlySecretKeyForJWTSigningMustBeAtLeast256BitsLongForHS256DoNotUseInProduction");

        provider.init();

        assertThat(getField(provider, "secretKey")).isNotNull();
    }

    // --- Helpers ---

    private JwtTokenProvider createProvider(String secret) throws Exception {
        JwtTokenProvider provider = new JwtTokenProvider();
        setField(provider, "jwtSecret", secret);
        return provider;
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    private Object getField(Object target, String fieldName) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        return field.get(target);
    }
}
