package com.hotel.hms.identity.repository;

import com.hotel.hms.identity.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Nạp luôn role và permission để dựng quyền đăng nhập trong một truy vấn.
    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findWithRolesByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    @EntityGraph(attributePaths = {"roles"})
    List<User> findAllByOrderByIdAsc();
}
