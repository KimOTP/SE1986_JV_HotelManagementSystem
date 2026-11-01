package com.hotel.hms.frontdesk.repository;

import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmailIgnoreCaseAndActiveTrue(String email);
    @Query("select count(p) from UserAccount u join u.roles r join r.permissions p where u.id=:userId and u.active=true and r.active=true and p.code=:permission")
    long countAllowed(@Param("userId") Long userId,@Param("permission") String permission);
    @Query("select count(r) from UserAccount u join u.roles r where u.id=:userId and r.active=true and r.code='ADMIN'")
    long countAdmin(@Param("userId") Long userId);

}
