package com.build_forge.pcbuilder.services;

import com.build_forge.pcbuilder.dto.AuthRequest;
import com.build_forge.pcbuilder.dto.AuthResponse;
import com.build_forge.pcbuilder.entity.User;
import com.build_forge.pcbuilder.exception.EmailNotAvailableException;
import com.build_forge.pcbuilder.exception.UserNotFoundException;
import com.build_forge.pcbuilder.exception.UsernameNotAvailableException;
import com.build_forge.pcbuilder.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    public JwtService jwtService;

    public AuthResponse signupNewUser(AuthRequest authRequest) {
        if (authRequest.getUsername() == null || authRequest.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (authRequest.getEmail() == null || authRequest.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (authRequest.getPassword() == null || authRequest.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        if (userRepository.existsByUsername(authRequest.getUsername())) {
            throw new UsernameNotAvailableException(authRequest.getUsername());
        }

        if (userRepository.existsByEmail(authRequest.getEmail())) {
            throw new EmailNotAvailableException(authRequest.getEmail());
        }

        User newUser = new User();
        newUser.setUsername(authRequest.getUsername());
        newUser.setEmail(authRequest.getEmail());
        newUser.setPassword(passwordEncoder.encode(authRequest.getPassword()));
        userRepository.save(newUser);

        return new AuthResponse("Signup Successful");
    }

    public AuthResponse loginUser(AuthRequest authRequest) {
        String identifier = authRequest.getUsername();
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("Username or email is required");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        identifier,
                        authRequest.getPassword()
                )
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new UserNotFoundException(identifier));

        String token = jwtService.generateToken(user.getUsername());
        return new AuthResponse("Login Successful", token);
    }
}
