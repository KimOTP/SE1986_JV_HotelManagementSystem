package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.repository.IssueReportRepository;
import com.hotel.hms.operations.repository.IssueReportRepository.*;
import com.hotel.hms.operations.security.OperationsIdentity;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class IssueReportService {
    private final IssueReportRepository persistence;
    private final OperationsIdentity identity;

    public IssueReportService(IssueReportRepository persistence, OperationsIdentity identity) {
        this.persistence = persistence;
        this.identity = identity;
    }

    private Reporter currentReporter() {
        String email = identity.email();
        var reporters = persistence.findActiveReporter(email);
        return reporters.isEmpty() ? null : reporters.getFirst();
    }

    @Transactional(readOnly = true)
    public IssueReportingContext getContext() {
        Reporter reporter = currentReporter();
        return reporter == null
                ? new IssueReportingContext(false, null, "Người báo cáo không hoạt động.")
                : new IssueReportingContext(
                        true, reporter.name(), "Báo cáo được lưu bằng tài khoản đang đăng nhập.");
    }

    @Transactional(readOnly = true)
    public List<IssueRoomResponse> getRooms() {
        var user = identity.requireUser();
        return persistence.findReportableRooms(
                user.getRoles().contains("ADMIN") ? 1 : 0, user.getId());
    }

    @Transactional
    public CreatedIssueResponse create(CreateIssueRequest request) {
        Reporter reporter = currentReporter();
        if (reporter == null)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Tài khoản người báo cáo không hoạt động.");
        boolean validRoom =
                getRooms().stream().anyMatch(room -> room.id().equals(request.roomId()));
        if (!validRoom)
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Room is not active or does not exist");
        Integer typeCount = persistence.countActiveType(request.issueTypeId());
        if (typeCount == null || typeCount == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Issue type is not active or does not exist");
        }
        // Append only: keep the existing JPA read models immutable; SQL supplies
        // timestamps/row_version.
        Long id = persistence.insert(request, reporter.id());
        return new CreatedIssueResponse(id, "OPEN");
    }
}
