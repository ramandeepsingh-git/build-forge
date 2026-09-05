package com.build_forge.pcbuilder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FavoriteComponentDto {
    @NotBlank
    private String category;

    @NotBlank
    @JsonProperty("id")
    private String id;
}
