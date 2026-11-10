package com.hotel.hms.frontdesk.repository;

import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmailIgnoreCaseAndActiveTrue(String email);
    boolean existsByIdAndActiveTrueAndRoles_ActiveTrueAndRoles_Permissions_Code(Long userId, String permission);
    boolean existsByIdAndRoles_ActiveTrueAndRoles_Code(Long userId, String code);

}
