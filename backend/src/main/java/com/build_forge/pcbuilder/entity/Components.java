package com.build_forge.pcbuilder.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public class Components {

    private String cpu;
    private String gpu;
    private String motherboard;
    private String ram;
    private String storage;
    private String psu;

    @JsonProperty("case")
    @Column(name = "pc_case")
    private String Case;

    private String cooler;
    private String fans;
    private String monitor;
    private String keyboard;
    private String mouse;

}
