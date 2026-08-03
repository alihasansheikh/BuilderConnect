package com.builderconnect.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Design brief for the Floor Plan Studio. Units are Pakistani residential: the
 * plot is entered as Marla/Kanal (or sq ft) and the service converts to square
 * feet before prompting. Bounds keep the generated program (and downstream
 * layout) within sane, single-storey residential limits.
 */
public record FloorPlanBrief(

        @Positive(message = "Plot size must be greater than 0")
        double plotValue,

        @NotNull(message = "Plot unit is required")
        PlotUnit unit,

        @Min(value = 1, message = "At least 1 bedroom is required")
        @Max(value = 8, message = "At most 8 bedrooms are supported")
        int bedrooms,

        @Min(value = 1, message = "At least 1 bathroom is required")
        @Max(value = 6, message = "At most 6 bathrooms are supported")
        int bathrooms,

        @NotNull(message = "Kitchen type is required")
        KitchenType kitchen,

        boolean drawingRoom,

        boolean carPorch,

        @Size(max = 500, message = "Notes are too long")
        String notes
) {

    /** Plot area units accepted by the studio (Marla = 225 sq ft, Kanal = 4500 sq ft). */
    public enum PlotUnit { MARLA, KANAL, SQFT }

    /** Kitchen layout options. */
    public enum KitchenType { OPEN, CLOSED }
}
