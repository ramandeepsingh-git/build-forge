package com.build_forge.pcbuilder.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    String message;
    String token;
    public AuthResponse(String message) {
        this.message = message;
    }
}
