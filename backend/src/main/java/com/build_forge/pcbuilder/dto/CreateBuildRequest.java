package com.build_forge.pcbuilder.dto;

import com.build_forge.pcbuilder.entity.Components;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateBuildRequest {

    @NotBlank
    @Size(min = 1, max = 1000)
    private String name;

    @Size(max = 1000)
    private String notes;

    @JsonProperty("parts")
    private Components components;

}