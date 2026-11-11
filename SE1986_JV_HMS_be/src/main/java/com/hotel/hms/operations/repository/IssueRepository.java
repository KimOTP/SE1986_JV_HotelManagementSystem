package com.hotel.hms.operations.repository;

import com.hotel.hms.operations.entity.Issue;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IssueRepository extends Repository<Issue, Long> {
    // Page IDs are selected with authorization/filtering in SQL before fetching to-one relations.
    @Query(
            """
            select i from Issue i
            join fetch i.room join fetch i.issueType join fetch i.reporter
            left join fetch i.assignedStaff s left join fetch s.user
            where i.id in :ids order by i.createdAt desc, i.id desc
            """)
    List<Issue> findIssuesByIds(@Param("ids") List<Long> ids);
}
