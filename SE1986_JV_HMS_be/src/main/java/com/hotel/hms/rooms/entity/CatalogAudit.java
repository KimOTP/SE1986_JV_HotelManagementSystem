package com.hotel.hms.rooms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PreUpdate;
import lombok.Getter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Clock;
import java.time.LocalDateTime;

/** Database owns insert timestamps and ROWVERSION. No optimistic-locking claim is made. */
@Getter
@MappedSuperclass
public abstract class CatalogAudit {
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false)
    private LocalDateTime updatedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "row_version", columnDefinition = "rowversion", length = 8, insertable = false, updatable = false)
    private byte[] rowVersion;

    @PreUpdate
    protected void updateAudit() {
        updatedAt = LocalDateTime.now(Clock.systemUTC());
    }
}
