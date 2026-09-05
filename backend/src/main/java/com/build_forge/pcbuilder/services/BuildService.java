package com.build_forge.pcbuilder.services;

import com.build_forge.pcbuilder.dto.BuildResponse;
import com.build_forge.pcbuilder.dto.CreateBuildRequest;
import com.build_forge.pcbuilder.dto.PageResponse;
import com.build_forge.pcbuilder.entity.Build;
import com.build_forge.pcbuilder.entity.User;
import com.build_forge.pcbuilder.exception.BuildNotFoundException;
import com.build_forge.pcbuilder.exception.UserNotFoundException;
import com.build_forge.pcbuilder.repository.BuildRepository;
import com.build_forge.pcbuilder.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class BuildService {

    @Autowired
    private BuildRepository buildRepository;

    @Autowired
    private UserRepository userRepository;

    public BuildResponse createBuild(CreateBuildRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));
        Build build = new Build();
        build.setName(request.getName());
        build.setUser(user);
        build.setNotes(request.getNotes());
        build.setComponents(request.getComponents());
        Build savedBuild = buildRepository.save(build);

        return mapToBuildResponse(savedBuild);
    }

    public List<Build> getAllBuilds(String username) {
        return buildRepository.findByUserUsername(username);
    }

    public PageResponse getAllBuilds(String username, int page, int size, Sort sort) {
        Page<Build> buildPage = buildRepository.findByUserUsername(username, PageRequest.of(page, size, sort));
        PageResponse pageResponse = new PageResponse();
        pageResponse.setPage(page);
        pageResponse.setPageSize(size);
        pageResponse.setTotalPages(buildPage.getTotalPages());
        pageResponse.setBuilds(buildPage.getContent());
        pageResponse.setTotalElements(buildPage.getTotalElements());
        return pageResponse;
    }

    public Optional<Build> getBuildById(Long id, String username) {
        return buildRepository.findByIdAndUserUsername(id, username);
    }

    public BuildResponse getBuildByIdResponse(Long id, String username) {
        Build build = buildRepository.findByIdAndUserUsername(id, username)
                .orElseThrow(() -> new BuildNotFoundException(id));
        return mapToBuildResponse(build);
    }

    @Transactional
    public BuildResponse updateBuild(Long id, CreateBuildRequest request, String username) {
        Build build = buildRepository.findByIdAndUserUsername(id, username)
                .orElseThrow(() -> new BuildNotFoundException(id));
        build.setName(request.getName());
        build.setNotes(request.getNotes());
        build.setComponents(request.getComponents());
        Build savedBuild = buildRepository.save(build);
        return mapToBuildResponse(savedBuild);
    }

    @Transactional
    public void deleteBuild(Long buildId, String username) {
        Build build = buildRepository.findByIdAndUserUsername(buildId, username)
                .orElseThrow(() -> new BuildNotFoundException(buildId));
        buildRepository.delete(build);
    }

    private BuildResponse mapToBuildResponse(Build build) {
        BuildResponse buildResponse = new BuildResponse();
        buildResponse.setId(build.getId());
        buildResponse.setName(build.getName());
        buildResponse.setNotes(build.getNotes());
        buildResponse.setCreatedAt(build.getCreatedAt());
        buildResponse.setUpdatedAt(build.getUpdatedAt());
        buildResponse.setUsername(build.getUser() != null ? build.getUser().getUsername() : null);
        buildResponse.setComponents(build.getComponents());
        return buildResponse;
    }
}
