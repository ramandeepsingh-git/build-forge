package com.build_forge.pcbuilder.controllers;

import com.build_forge.pcbuilder.dto.FavoriteComponentDto;
import com.build_forge.pcbuilder.dto.UserRequest;
import com.build_forge.pcbuilder.dto.UserResponse;
import com.build_forge.pcbuilder.entity.User;
import com.build_forge.pcbuilder.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/users")
    public List<UserResponse> getUser(){
        List<User> users = userService.getUsers();
        List<UserResponse> responses = new ArrayList<>();
        for (User user : users) {
            responses.add(mapToUserResponse(user));
        }
        return responses;
    }

    @GetMapping("/users/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        User user = userService.getUserByUsername(authentication.getName());
        return ResponseEntity.ok(mapToUserResponse(user));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        Optional<User> user = userService.getUserById(id);
        if (user.isPresent()) {
            return ResponseEntity.ok(mapToUserResponse(user.get()));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<UserResponse> deleteUser(@PathVariable Long id){
        Optional<User> user = userService.getUserById(id);
        if (user.isPresent()) {
            userService.deleteUser(id);
            return ResponseEntity.ok(mapToUserResponse(user.get()));
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody UserRequest userRequest){
        Optional<User> userOpt = userService.getUserById(id);

        if(userOpt.isPresent()){
            User user = userOpt.get();
            if (userRequest.getUsername() != null) {
                user.setUsername(userRequest.getUsername());
            }
            if (userRequest.getEmail() != null) {
                user.setEmail(userRequest.getEmail());
            }
            if (userRequest.getPassword() != null && !userRequest.getPassword().isEmpty()) {
                user.setPassword(passwordEncoder.encode(userRequest.getPassword()));
            }
            User updatedUser = userService.saveUser(user);
            return ResponseEntity.ok(mapToUserResponse(updatedUser));
        }

        return ResponseEntity.notFound().build();
    }

    @GetMapping("/users/me/favorites/components")
    public ResponseEntity<List<FavoriteComponentDto>> getFavoriteComponents(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userService.getFavoriteComponents(authentication.getName()));
    }

    @PostMapping("/users/me/favorites/components")
    public ResponseEntity<FavoriteComponentDto> addFavoriteComponent(@RequestBody FavoriteComponentDto dto, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userService.addFavoriteComponent(authentication.getName(), dto.getCategory(), dto.getId()));
    }

    @DeleteMapping("/users/me/favorites/components/{category}/{componentId}")
    public ResponseEntity<Void> removeFavoriteComponent(@PathVariable String category, @PathVariable String componentId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        userService.removeFavoriteComponent(authentication.getName(), category, componentId);
        return ResponseEntity.noContent().build();
    }

    private UserResponse mapToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        return response;
    }
}
