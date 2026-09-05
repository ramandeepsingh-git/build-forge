package com.build_forge.pcbuilder.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_favorite_components", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "category", "component_id"})
})
@Data
@NoArgsConstructor
public class FavoriteComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String category;

    @Column(name = "component_id", nullable = false)
    @JsonProperty("id")
    private String componentId;

    public FavoriteComponent(User user, String category, String componentId) {
        this.user = user;
        this.category = category;
        this.componentId = componentId;
    }
}
