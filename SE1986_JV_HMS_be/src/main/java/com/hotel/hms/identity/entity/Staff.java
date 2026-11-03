package com.hotel.hms.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

/** Thông tin nhân sự nội bộ (MANAGER/STAFF) gắn với một khách sạn. */
@Entity
@Table(name = "staff", schema = "identity_access")
@Getter
@Setter
@NoArgsConstructor
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "staff_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(name = "employee_code", nullable = false, length = 30)
    private String employeeCode;

    @Nationalized
    @Column(name = "job_title", length = 100)
    private String jobTitle;

    @Column(name = "is_active", nullable = false)
    private Boolean active;
}
