package com.builderconnect.dto.response;

/**
 * The generated semantic floor-plan program, returned verbatim as a raw JSON
 * string. The backend does no geometry — the client validates this shape and
 * lays out the rooms/furniture deterministically.
 */
public record FloorPlanResponse(String planJson) {}
