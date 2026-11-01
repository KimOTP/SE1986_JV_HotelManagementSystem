package com.hotel.hms.frontdesk.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users", schema = "identity_access")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class UserAccount {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "full_name", length = 150)
    private String fullName;

    @org.hibernate.annotations.Nationalized
    @Column(name = "email", length = 254)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "password_hash", length = 255)
    @ToString.Exclude
    private String passwordHash;

    @Column(name = "google_subject", length = 255)
    private String googleSubject;

    @org.hibernate.annotations.Nationalized
    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "email_verified")
    private Boolean emailVerified;

    @Column(name = "is_active")
    private Boolean active;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(
            name = "row_version",
            columnDefinition = "rowversion",
            length = 8,
            insertable = false,
            updatable = false
    )
    private byte[] rowVersion;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles", schema = "identity_access",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    @ToString.Exclude
    private Set<RoleEntity> roles;
}
