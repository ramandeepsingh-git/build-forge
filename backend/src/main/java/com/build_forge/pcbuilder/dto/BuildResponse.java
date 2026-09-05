package com.build_forge.pcbuilder.dto;

import com.build_forge.pcbuilder.entity.Components;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BuildResponse {
    Long id;
    String name;
    String notes;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String username;

    @JsonProperty("parts")
    private Components components;
}
