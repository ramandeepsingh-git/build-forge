package com.build_forge.pcbuilder.exception;

public class EmailNotAvailableException extends RuntimeException {
    public EmailNotAvailableException(String email) {
        super("The email " + email + " is already in use");
    }
}
