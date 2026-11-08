package com.hotel.hms.identity.repository;

import com.hotel.hms.identity.entity.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByCodeAndActiveTrue(String code);

    Optional<Role> findByCode(String code);

    @EntityGraph(attributePaths = {"permissions"})
    List<Role> findAllByOrderByIdAsc();
}
