package com.build_forge.pcbuilder.exception;

public class UsernameNotAvailableException extends RuntimeException {
    public UsernameNotAvailableException(String username) {
        super("Username " + username + " is not available");
    }
}
