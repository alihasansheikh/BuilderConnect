package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TokenRequest {
    @NotBlank(message = "Token is required")
    private String token;
}
