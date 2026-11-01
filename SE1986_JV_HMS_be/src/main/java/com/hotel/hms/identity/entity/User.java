package com.hotel.hms.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", schema = "identity_access")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Nationalized
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Nationalized
    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    // Null khi tài khoản chỉ đăng nhập bằng Google.
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "google_subject", length = 255)
    private String googleSubject;

    @Nationalized
    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified;

    @Column(name = "is_active", nullable = false)
    private Boolean active;

    // Giá trị UTC do database tự sinh (sysutcdatetime()).
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_roles",
            schema = "identity_access",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
}
