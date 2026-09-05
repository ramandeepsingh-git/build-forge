package com.build_forge.pcbuilder.repository;

import com.build_forge.pcbuilder.entity.Build;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BuildRepository extends JpaRepository<Build, Long> {

    Page<Build> findByUserUsername(String username, Pageable pageable);

    List<Build> findByUserUsername(String username);

    Optional<Build> findByIdAndUserUsername(Long id, String username);

    List<Build> findByUserId(Long id);

    List<Build> findByNameContaining(String name);

    List<Build> findByUserIdAndNameContaining(Long id, String name);

    @Query("""
    SELECT b
    FROM Build b
    WHERE b.name LIKE CONCAT('%', :name, '%')
""")
    List<Build> findBuildContaining(@Param("name") String name);
}
