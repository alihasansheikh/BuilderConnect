package com.builderconnect.dto.request;

import com.builderconnect.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for user registration request.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;

    @NotNull(message = "Role is required")
    private UserRole role;

    @Size(max = 20, message = "Phone number must be less than 20 characters")
    private String phone;

    @Size(max = 100, message = "City must be less than 100 characters")
    private String city;

    @Size(max = 500, message = "Address must be less than 500 characters")
    private String address;

    // Builder-specific fields
    private String companyName;
    private Integer yearsOfExperience;

    // Supplier-specific fields
    private String warehouseAddress;
}
