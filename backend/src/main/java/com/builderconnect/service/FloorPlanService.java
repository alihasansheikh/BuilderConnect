package com.builderconnect.service;

import com.builderconnect.dto.request.FloorPlanBrief;
import com.builderconnect.dto.response.FloorPlanResponse;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.llm.LlmClient;
import com.builderconnect.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Generates a SEMANTIC floor-plan program (rooms with types, relative sizes,
 * zones, adjacencies, and furniture — but NO coordinates) from a design brief,
 * for clients and builders. Reuses the shared LLM core in structured-JSON mode;
 * deterministic client-side code turns the program into editable geometry.
 *
 * <p>Stateless — nothing is persisted. Gated by the shared assistant kill-switch
 * plus a configured Gemini key, exactly like {@link AiAssistantService}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FloorPlanService {

    private static final double TEMPERATURE = 0.6;
    private static final int MAX_OUTPUT_TOKENS = 4096;
    private static final double SQFT_PER_MARLA = 225.0;
    private static final double SQFT_PER_KANAL = 4500.0;

    private final LlmClient llmClient;
    private final SystemSettingService systemSettingService;

    public boolean isAvailable() {
        return systemSettingService.getBool(SystemSettingService.KEY_AI_ASSISTANT_ENABLED, true)
                && llmClient.isConfigured();
    }

    public FloorPlanResponse generate(User user, FloorPlanBrief brief) {
        if (!isAvailable()) {
            throw new BadRequestException("Floor plan generation is currently unavailable.");
        }
        SecurityUtils.validateNotSuspended(user);

        double plotSqft = plotSquareFeet(brief);

        // LLM call happens OUTSIDE any DB transaction; on failure it throws
        // LlmUnavailableException -> 503 and nothing is returned or persisted.
        String planJson = llmClient.generateJson(
                buildSystemInstruction(brief, plotSqft),
                List.of(),
                buildResponseSchema(),
                new LlmClient.GenConfig(TEMPERATURE, MAX_OUTPUT_TOKENS));

        return new FloorPlanResponse(planJson);
    }

    private double plotSquareFeet(FloorPlanBrief brief) {
        return switch (brief.unit()) {
            case MARLA -> brief.plotValue() * SQFT_PER_MARLA;
            case KANAL -> brief.plotValue() * SQFT_PER_KANAL;
            case SQFT -> brief.plotValue();
        };
    }

    private String buildSystemInstruction(FloorPlanBrief brief, double plotSqft) {
        String kitchenDesc = brief.kitchen() == FloorPlanBrief.KitchenType.OPEN
                ? "OPEN (open-plan, connected to the lounge/dining)"
                : "CLOSED (separate enclosed kitchen)";
        String kitchenShort = brief.kitchen() == FloorPlanBrief.KitchenType.OPEN ? "open" : "closed";
        String notes = (brief.notes() == null || brief.notes().isBlank()) ? "none" : brief.notes().trim();

        StringBuilder mustInclude = new StringBuilder();
        if (brief.drawingRoom()) {
            mustInclude.append(", a separate drawing room");
        }
        if (brief.carPorch()) {
            mustInclude.append(", a car porch");
        }

        return """
                You are an experienced Pakistani residential architect. Design a SINGLE-STOREY \
                house floor plan that satisfies the requirements below, then output the design as \
                a SEMANTIC PROGRAM ONLY (rooms and their relationships — never coordinates).

                Design requirements for THIS house:
                - Plot: about %.0f square feet (%s %s), single storey.
                - Bedrooms: %d
                - Bathrooms: %d
                - Kitchen: %s
                - Separate drawing room: %s
                - Car porch: %s
                - Client notes: %s

                The plan MUST include exactly %d bedroom(s), exactly %d bathroom(s), a %s kitchen, \
                a lounge/living area, a dining area, and a small lobby/entrance%s. Give bedrooms \
                sensible sizes and, when the bathroom count allows, attach one bathroom to the \
                master bedroom (via its attachedBath id).

                OUTPUT RULES — read carefully:
                - Output ONLY JSON matching the provided schema. No prose, no Markdown, no comments.
                - Choose plotWidthFt and plotLengthFt as a sensible rectangle whose area is close to \
                  the plot square footage, using a typical residential aspect ratio (roughly 1:1.5 to \
                  1:2; width is the street frontage).
                - For every room give: a unique id, a human name, a type from the allowed enum, a \
                  targetAreaSqft (RELATIVE size in square feet — sizes across rooms should sum to \
                  roughly the usable plot area), a zone hint, an optional attachedBath (the id of a \
                  BATHROOM room that belongs inside that bedroom), and a furniture list drawn from: \
                  BED, WARDROBE, SIDE_TABLE, SOFA, TV, COFFEE_TABLE, DINING_TABLE, CHAIR, TOILET, \
                  SINK, BATHTUB, SHOWER, KITCHEN_COUNTER, STOVE, FRIDGE, CAR.
                - Set entranceRoomId to the id of the lobby/entrance room.
                - CRITICAL: DO NOT output any coordinates, x/y, or pixel positions. Provide ONLY \
                  relative sizes (targetAreaSqft) and zone hints. Deterministic software places the \
                  geometry — you decide the program, not the pixels.
                """.formatted(
                        plotSqft,
                        trimNumber(brief.plotValue()),
                        brief.unit().name().toLowerCase(),
                        brief.bedrooms(),
                        brief.bathrooms(),
                        kitchenDesc,
                        brief.drawingRoom() ? "yes" : "no",
                        brief.carPorch() ? "yes" : "no",
                        notes,
                        brief.bedrooms(),
                        brief.bathrooms(),
                        kitchenShort,
                        mustInclude.toString());
    }

    /**
     * OpenAPI-subset schema for Gemini structured output. Mirrors the semantic
     * plan the client validates with zod.
     */
    private Map<String, Object> buildResponseSchema() {
        Map<String, Object> roomProps = new LinkedHashMap<>();
        roomProps.put("id", Map.of("type", "string"));
        roomProps.put("name", Map.of("type", "string"));
        roomProps.put("type", Map.of(
                "type", "string",
                "enum", List.of("BEDROOM", "BATHROOM", "KITCHEN", "LIVING", "DRAWING",
                        "DINING", "LOBBY", "CAR_PORCH", "STORE")));
        roomProps.put("targetAreaSqft", Map.of("type", "number"));
        roomProps.put("zone", Map.of(
                "type", "string",
                "enum", List.of("front-left", "front", "front-right", "left", "center",
                        "right", "back-left", "back", "back-right")));
        roomProps.put("attachedBath", Map.of("type", "string"));
        roomProps.put("furniture", Map.of("type", "array", "items", Map.of("type", "string")));

        Map<String, Object> roomSchema = new LinkedHashMap<>();
        roomSchema.put("type", "object");
        roomSchema.put("properties", roomProps);
        roomSchema.put("required", List.of("id", "name", "type", "targetAreaSqft", "zone", "furniture"));

        Map<String, Object> props = new LinkedHashMap<>();
        props.put("plotWidthFt", Map.of("type", "number"));
        props.put("plotLengthFt", Map.of("type", "number"));
        props.put("rooms", Map.of("type", "array", "items", roomSchema));
        props.put("entranceRoomId", Map.of("type", "string"));
        props.put("notes", Map.of("type", "string"));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", props);
        schema.put("required", List.of("plotWidthFt", "plotLengthFt", "rooms", "entranceRoomId"));
        return schema;
    }

    private static String trimNumber(double value) {
        if (value == Math.floor(value) && !Double.isInfinite(value)) {
            return String.valueOf((long) value);
        }
        return String.valueOf(value);
    }
}
