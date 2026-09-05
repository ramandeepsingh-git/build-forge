package com.build_forge.pcbuilder.controllers;

import com.build_forge.pcbuilder.dto.AuthRequest;
import com.build_forge.pcbuilder.dto.AuthResponse;
import com.build_forge.pcbuilder.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    private AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> createUser(@RequestBody AuthRequest authRequest) {
        return ResponseEntity.ok(authService.signupNewUser(authRequest));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest authRequest) {
        return ResponseEntity.ok(authService.loginUser(authRequest));
    }
}
