package com.builderconnect.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BuilderProfileUpdateRequest {
    private String companyName;
    private String bio;
    private String specializations;       // JSON array string
    private String skills;                // JSON array string
    private String serviceAreas;          // JSON array string
    private BigDecimal hourlyRate;
    private BigDecimal minimumProjectValue;
    private Integer yearsOfExperience;
    private Boolean isAvailable;
    private String portfolioDescription;

    // Enhanced profile fields
    private String primaryTrade;
    private String secondaryTrades;       // JSON array string
    private String experiencePerTrade;    // JSON object string
    private String ntnNumber;
    private String pecNumber;
    private String teamMembers;           // JSON array string
    private Integer serviceAreaRadius;
}
