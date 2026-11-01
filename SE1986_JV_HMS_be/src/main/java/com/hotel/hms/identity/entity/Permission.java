package com.hotel.hms.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

/** Quyền theo mã UC (vd. UC-A5). */
@Entity
@Table(name = "permissions", schema = "identity_access")
@Getter
@Setter
@NoArgsConstructor
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "permission_id")
    private Long id;

    @Column(name = "code", nullable = false, length = 100)
    private String code;

    @Nationalized
    @Column(name = "name", nullable = false, length = 150)
    private String name;
}
