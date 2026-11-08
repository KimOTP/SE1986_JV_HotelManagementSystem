package com.hotel.hms.identity.repository;

import com.hotel.hms.identity.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {

    Optional<Staff> findByUser_IdAndActiveTrue(Long userId);

    Optional<Staff> findByUser_Id(Long userId);

    @Query("select s from Staff s join fetch s.user")
    List<Staff> findAllWithUser();

    @Query(value = "select hotel_id from identity_access.hotels where is_active = 1", nativeQuery = true)
    List<Long> findActiveHotelIds();
}
