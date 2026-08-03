package com.builderconnect.security;

import com.builderconnect.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT Token Provider for generating and validating JWT tokens.
 */
@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${jwt.issuer}")
    private String issuer;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                "JWT secret is not configured. Set the JWT_SECRET environment variable.");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                "JWT secret must be at least 32 characters (256 bits) for HS256. "
                + "Set the JWT_SECRET environment variable with a sufficiently long value.");
        }
        // Derive a fixed 512-bit key (SHA-512 of the configured secret) so the
        // signing algorithm is always HS512 regardless of secret length —
        // jjwt would otherwise auto-select HS256/384/512 from the raw key size.
        try {
            byte[] derivedKey = MessageDigest.getInstance("SHA-512")
                    .digest(jwtSecret.getBytes(StandardCharsets.UTF_8));
            this.secretKey = Keys.hmacShaKeyFor(derivedKey);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 is not available in this JVM", e);
        }
        log.info("JWT token provider initialized successfully (HS512)");
    }

    public String generateAccessToken(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return generateAccessToken(user);
    }

    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpiration);

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().name());
        claims.put("name", user.getName());

        return Jwts.builder()
                .claims(claims)
                .subject(user.getId().toString())
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey, Jwts.SIG.HS512)
                .compact();
    }

    public String generateRefreshToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpiration);

        return Jwts.builder()
                .subject(user.getId().toString())
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiryDate)
                .claim("type", "refresh")
                .signWith(secretKey, Jwts.SIG.HS512)
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        return Long.parseLong(claims.getSubject());
    }

    public String getEmailFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("email", String.class);
    }

    public String getRoleFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token: {}", ex.getMessage());
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token: {}", ex.getMessage());
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token: {}", ex.getMessage());
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty: {}", ex.getMessage());
        } catch (SecurityException ex) {
            log.error("JWT signature validation failed: {}", ex.getMessage());
        }
        return false;
    }

    public boolean isTokenExpired(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().before(new Date());
        } catch (ExpiredJwtException ex) {
            return true;
        }
    }

    public Date getExpirationFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.getExpiration();
    }

    private Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpiration;
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpiration;
    }
}
