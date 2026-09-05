package com.build_forge.pcbuilder.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    int status;
    Map<String, String> errors;
    String error;
    String message;
    LocalDateTime timestamp;
}
