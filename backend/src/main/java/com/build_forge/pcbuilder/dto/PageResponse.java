package com.build_forge.pcbuilder.dto;

import com.build_forge.pcbuilder.entity.Build;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
@Data
public class PageResponse {

    List<BuildResponse> builds;
    int pageSize;
    int page;
    Long totalElements;
    int totalPages;

    public void setBuilds(List<Build> builds) {
        this.builds = new ArrayList<>();
        builds.forEach(build -> {
            BuildResponse buildResponse = new BuildResponse();
            buildResponse.setId(build.getId());
            buildResponse.setName(build.getName());
            buildResponse.setCreatedAt(build.getCreatedAt());
            buildResponse.setUpdatedAt(build.getUpdatedAt());
            buildResponse.setNotes(build.getNotes());
            buildResponse.setUsername(build.getUser().getUsername());
            buildResponse.setComponents(build.getComponents());
            this.builds.add(buildResponse);
        });
    }
}
