package com.hotel.hms.identity.repository;

import com.hotel.hms.identity.entity.AuthToken;
import com.hotel.hms.identity.entity.TokenPurpose;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {

    @EntityGraph(attributePaths = {"user"})
    Optional<AuthToken> findByTokenHashAndPurpose(String tokenHash, TokenPurpose purpose);

    Optional<AuthToken> findFirstByUser_IdAndPurposeOrderByCreatedAtDesc(Long userId, TokenPurpose purpose);

    @Modifying
    @Query("""
            update AuthToken t set t.revokedAt = :now
            where t.user.id = :userId and t.purpose = :purpose
              and t.revokedAt is null and t.consumedAt is null
            """)
    int revokeAllActive(@Param("userId") Long userId,
                        @Param("purpose") TokenPurpose purpose,
                        @Param("now") LocalDateTime now);
}
