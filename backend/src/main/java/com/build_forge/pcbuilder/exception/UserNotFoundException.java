package com.build_forge.pcbuilder.exception;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long userId) {
        super("The user with id " + userId + " not found");
    }
    public UserNotFoundException(String username) {super("The user with username " + username + " not found");}
}
