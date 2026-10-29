package com.hotel.hms.operations.repository;

import com.hotel.hms.operations.entity.IssueType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IssueTypeRepository extends JpaRepository<IssueType, Long> {

    List<IssueType> findByActiveTrueOrderByIdAsc();
}