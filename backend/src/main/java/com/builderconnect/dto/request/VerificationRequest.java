package com.builderconnect.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Body of a builder/supplier verification request. Both fields are optional —
 * credentials themselves live on the profile (NTN/PEC/business registration number).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationRequest {

    private String note;

    private List<String> documentUrls;
}
