package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.IssueTypeResponse;
import com.hotel.hms.operations.repository.IssueTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueTypeService {

    private final IssueTypeRepository repository;

    public IssueTypeService(IssueTypeRepository repository) {
        this.repository = repository;
    }

    public List<IssueTypeResponse> getActiveIssueTypes() {
        return repository.findByActiveTrueOrderByIdAsc()
                .stream()
                .map(type -> new IssueTypeResponse(
                        type.getId(),
                        type.getName()
                ))
                .toList();
    }
}