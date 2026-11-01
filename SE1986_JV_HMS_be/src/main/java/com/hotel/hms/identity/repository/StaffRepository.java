package com.hotel.hms.identity.repository;

import com.hotel.hms.identity.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {

    Optional<Staff> findByUser_IdAndActiveTrue(Long userId);
}
