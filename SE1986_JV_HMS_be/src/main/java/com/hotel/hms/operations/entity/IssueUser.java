package com.hotel.hms.operations.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "users", schema = "identity_access")
public class IssueUser {
    @Id
    @Column(name = "user_id")
    private Long id;
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;
    protected IssueUser() {}
    public Long getId() { return id; }
    public String getFullName() { return fullName; }
}
