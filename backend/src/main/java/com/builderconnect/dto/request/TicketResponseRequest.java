package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponseRequest {

    @NotBlank(message = "Message is required")
    private String message;

    private Boolean isInternal;
}
