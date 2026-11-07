package com.hotel.hms.identity.repository;

import com.hotel.hms.identity.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {

    Optional<Staff> findByUser_IdAndActiveTrue(Long userId);

    @Query("select s from Staff s join fetch s.user where s.active = true")
    List<Staff> findAllWithUser();
}
