package com.build_forge.pcbuilder.exception;

public class BuildNotFoundException extends RuntimeException {
    public BuildNotFoundException(Long id) {
        super("Build with id " + id + " not found");
    }
}
