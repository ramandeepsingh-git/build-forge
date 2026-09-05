package com.build_forge.pcbuilder.controllers;

import com.build_forge.pcbuilder.dto.BuildResponse;
import com.build_forge.pcbuilder.dto.CreateBuildRequest;
import com.build_forge.pcbuilder.dto.PageResponse;
import com.build_forge.pcbuilder.services.BuildService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class BuildController {
    @Autowired
    private BuildService buildService;

    @PostMapping("/builds")
    public ResponseEntity<BuildResponse> createBuild(@RequestBody @Valid CreateBuildRequest buildRequest, Authentication authentication) {
        return ResponseEntity.ok(buildService.createBuild(buildRequest, authentication.getName()));
    }

    @GetMapping("/builds")
    public ResponseEntity<PageResponse> getAllBuilds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            Authentication authentication) {
        List<String> sorted = List.of(sort.split(","));
        return ResponseEntity.ok(buildService.getAllBuilds(authentication.getName(), page, size, Sort.by(Sort.Direction.fromString(sorted.get(1)), sorted.get(0))));
    }

    @GetMapping("/builds/{id}")
    public ResponseEntity<BuildResponse> getBuildById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(buildService.getBuildByIdResponse(id, authentication.getName()));
    }

    @PutMapping("/builds/{id}")
    public ResponseEntity<BuildResponse> updateBuild(@PathVariable Long id, @RequestBody @Valid CreateBuildRequest buildRequest, Authentication authentication) {
        return ResponseEntity.ok(buildService.updateBuild(id, buildRequest, authentication.getName()));
    }

    @DeleteMapping("/builds/{id}")
    public ResponseEntity<Void> deleteBuild(@PathVariable Long id, Authentication authentication) {
        buildService.deleteBuild(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
