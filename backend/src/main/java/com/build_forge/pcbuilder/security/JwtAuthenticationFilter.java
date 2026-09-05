package com.build_forge.pcbuilder.security;

import com.build_forge.pcbuilder.services.CustomUserDetailsService;
import com.build_forge.pcbuilder.services.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String jwt = authHeader.substring(7);

        String username = jwtService.extractUsername(jwt);

        try {
            UserDetails userDetails =
                    customUserDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
        } catch (Exception e) {
            // Keep the context unauthenticated if user details cannot be loaded (e.g. user deleted)
        }

        filterChain.doFilter(request, response);
    }
}
//Request
//  ↓
//Authorization header?
//        ↓
//Bearer JWT?
//        ↓
//extract JWT
//  ↓
//verify JWT + extract username
//  ↓
//load user from DB
//  ↓
//create Authentication
//  ↓
//put it in SecurityContext
//  ↓
//continue filter chain
//  ↓
//Controller