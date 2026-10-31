package com.hotel.hms.operations;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.IssueAssignmentService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class IssueAssignmentServiceTests {
    private JdbcTemplate jdbc;
    private MockEnvironment environment;
    private IssueAssignmentService service;

    @BeforeEach void setup() {
        jdbc = mock(JdbcTemplate.class);
        environment = new MockEnvironment();
        service = new IssueAssignmentService(jdbc, environment);
    }
    private void manager(boolean admin) {
        environment.setActiveProfiles("local-demo");
        environment.setProperty("operations.demo-manager-email", "manager@sba.example");
        when(jdbc.query(contains("WHERE u.email"), org.mockito.ArgumentMatchers.<RowMapper<IssueAssignmentService.Manager>>any(), eq("manager@sba.example")))
                .thenReturn(List.of(new IssueAssignmentService.Manager(2L, "Manager Demo", admin)));
    }
    private void issue(String status, Long assignedStaffId) {
        when(jdbc.query(contains("FROM operations.issues i"), org.mockito.ArgumentMatchers.<RowMapper<IssueAssignmentService.IssueState>>any(), eq(1L)))
                .thenReturn(List.of(new IssueAssignmentService.IssueState(1L, 1L, status, assignedStaffId)));
    }
    private void scope(int count) {
        when(jdbc.queryForObject(contains("FROM identity_access.staff"), eq(Integer.class), eq(2L), eq(1L)))
                .thenReturn(count);
    }
    private void staff(List<IssueAssigneeResponse> items) {
        when(jdbc.query(contains("SELECT s.staff_id"), org.mockito.ArgumentMatchers.<RowMapper<IssueAssigneeResponse>>any(), eq(1L)))
                .thenReturn(items);
    }
    private void noUpdate() { verify(jdbc, never()).update(anyString(), eq(3L), eq(2L), eq(1L)); }

    @Test void disabledWithoutProfileEvenWhenEmailExists() {
        environment.setProperty("operations.demo-manager-email", "manager@sba.example");
        assertFalse(service.getContext().enabled());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void disabledForMissingInactiveOrUnqualifiedManager() {
        manager(false);
        when(jdbc.query(contains("WHERE u.email"), org.mockito.ArgumentMatchers.<RowMapper<IssueAssignmentService.Manager>>any(), eq("manager@sba.example"))).thenReturn(List.of());
        assertFalse(service.getContext().enabled());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
        noUpdate();
    }
    @Test void missingIssueReturns404() {
        manager(false);
        when(jdbc.query(contains("FROM operations.issues i"), org.mockito.ArgumentMatchers.<RowMapper<IssueAssignmentService.IssueState>>any(), eq(1L))).thenReturn(List.of());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.getAssignees(1L)).getStatusCode().value());
        noUpdate();
    }
    @Test void rejectsEveryNonOpenStateAndAlreadyAssignedOpenIssue() {
        manager(false);
        for (String status : List.of("ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED")) {
            issue(status, null);
            assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
        }
        issue("OPEN", 3L);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
        noUpdate();
    }
    @Test void managerCannotAccessAnotherHotel() {
        manager(false); issue("OPEN", null); scope(0);
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.getAssignees(1L)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
        noUpdate();
    }
    @Test void rejectsStaffOutsideEligibleHotelAndActiveStaffList() {
        manager(false); issue("OPEN", null); scope(1); staff(List.of());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
        noUpdate();
    }
    @Test void returnsOnlyEligibleStaffForIssueHotel() {
        manager(false); issue("OPEN", null); scope(1);
        var expected = List.of(new IssueAssigneeResponse(3L, "Housekeeper Demo", "H001"));
        staff(expected);
        assertEquals(expected, service.getAssignees(1L));
    }
    @Test void savesConfiguredManagerAndStaffWithConditionalStateTransition() {
        manager(false); issue("OPEN", null); scope(1);
        staff(List.of(new IssueAssigneeResponse(3L, "Housekeeper Demo", "H001")));
        when(jdbc.update(contains("status = 'OPEN' AND assigned_staff_id IS NULL"), eq(3L), eq(2L), eq(1L))).thenReturn(1);
        assertEquals(new IssueAssignmentResponse(1L, 3L, 2L, "ASSIGNED"), service.assign(1L, new AssignIssueRequest(3L)));
        verify(jdbc).update(contains("updated_at = SYSUTCDATETIME()"), eq(3L), eq(2L), eq(1L));
    }
    @Test void concurrentAssignmentReturns409InsteadOfReportingSuccess() {
        manager(false); issue("OPEN", null); scope(1);
        staff(List.of(new IssueAssigneeResponse(3L, "Housekeeper Demo", "H001")));
        when(jdbc.update(anyString(), eq(3L), eq(2L), eq(1L))).thenReturn(0);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.assign(1L, new AssignIssueRequest(3L))).getStatusCode().value());
    }
    @Test void adminCanListEligibleStaffWithoutManagerStaffMembership() {
        manager(true); issue("OPEN", null);
        var expected = List.of(new IssueAssigneeResponse(3L, "Housekeeper Demo", "H001"));
        staff(expected);
        assertEquals(expected, service.getAssignees(1L));
        verify(jdbc, never()).queryForObject(contains("FROM identity_access.staff"), eq(Integer.class), eq(2L), eq(1L));
    }
    @Test void validatesPositiveStaffId() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(new AssignIssueRequest(3L)).isEmpty());
            assertFalse(validator.validate(new AssignIssueRequest(null)).isEmpty());
            assertFalse(validator.validate(new AssignIssueRequest(0L)).isEmpty());
            assertFalse(validator.validate(new AssignIssueRequest(-1L)).isEmpty());
        }
    }
}
