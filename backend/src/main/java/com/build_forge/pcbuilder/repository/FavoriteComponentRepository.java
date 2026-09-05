package com.build_forge.pcbuilder.repository;

import com.build_forge.pcbuilder.entity.FavoriteComponent;
import com.build_forge.pcbuilder.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteComponentRepository extends JpaRepository<FavoriteComponent, Long> {

    List<FavoriteComponent> findByUser(User user);

    Optional<FavoriteComponent> findByUserAndCategoryAndComponentId(User user, String category, String componentId);

    void deleteByUserAndCategoryAndComponentId(User user, String category, String componentId);
}
