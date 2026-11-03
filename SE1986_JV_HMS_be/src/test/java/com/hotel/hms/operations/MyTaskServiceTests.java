package com.hotel.hms.operations;

import com.hotel.hms.operations.controller.MyTaskController;
import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.*;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class MyTaskServiceTests {
    private JdbcTemplate jdbc;
    private IssueProgressService identity;
    private MyTaskService service;
    @BeforeEach void setup() {
        jdbc = mock(JdbcTemplate.class);
        identity = mock(IssueProgressService.class);
        when(identity.requireWorker()).thenReturn(new IssueProgressService.Worker(3L, 1L, "Housekeeper Demo"));
        service = new MyTaskService(jdbc, identity);
    }
    private void task(Long hotelId, Long assignedStaffId, String status) {
        when(jdbc.query(contains("SELECT t.task_id, rt.hotel_id"), org.mockito.ArgumentMatchers.<RowMapper<MyTaskService.TaskState>>any(), eq(1L)))
                .thenReturn(List.of(new MyTaskService.TaskState(1L, hotelId, assignedStaffId, status)));
    }
    private void noWrite() { verify(jdbc, never()).update(anyString(), eq(1L), eq(3L)); }
    @Test void noIdentityMeansNoReadOrWrite() {
        when(identity.requireWorker()).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));
        assertThrows(ResponseStatusException.class, () -> service.getTasks(0, 5, "", "", ""));
        assertThrows(ResponseStatusException.class, () -> service.start(1L));
        assertThrows(ResponseStatusException.class, () -> service.complete(1L));
        verifyNoInteractions(jdbc);
    }
    @Test void bindsServerStaffHotelFiltersAndOffsetBeforeReturningTasks() {
        var date = LocalDateTime.of(2026, 10, 31, 1, 0);
        var expected = List.of(new MyTaskResponse(1L, "103", null, "CLEANING", "Dọn phòng", null, "NORMAL", "PENDING", date, null, null));
        when(jdbc.query(contains("OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"), org.mockito.ArgumentMatchers.<RowMapper<MyTaskResponse>>any(),
                eq(3L), eq(1L), eq("103"), eq("103"), eq("PENDING"), eq("PENDING"), eq("CLEANING"), eq("CLEANING"), eq(10L), eq(5))).thenReturn(expected);
        assertEquals(expected, service.getTasks(2, 5, " 103 ", "PENDING", "CLEANING"));
        verify(jdbc).query(contains("WHERE t.assigned_staff_id = ? AND rt.hotel_id = ?"), org.mockito.ArgumentMatchers.<RowMapper<MyTaskResponse>>any(),
                eq(3L), eq(1L), eq("103"), eq("103"), eq("PENDING"), eq("PENDING"), eq("CLEANING"), eq("CLEANING"), eq(10L), eq(5));
    }
    @Test void missingOrInactiveTaskReturns404() {
        when(jdbc.query(contains("SELECT t.task_id, rt.hotel_id"), org.mockito.ArgumentMatchers.<RowMapper<MyTaskService.TaskState>>any(), eq(1L))).thenReturn(List.of());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        noWrite();
    }
    @Test void otherStaffOrHotelCannotChangeTask() {
        for (var state : List.of(new MyTaskService.TaskState(1L, 2L, 3L, "PENDING"), new MyTaskService.TaskState(1L, 1L, 2L, "PENDING"))) {
            task(state.hotelId(), state.assignedStaffId(), state.status());
            assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
            assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.complete(1L)).getStatusCode().value());
        }
        noWrite();
    }
    @Test void startDoesNotAllowReopeningOrCancelledTasks() {
        for (String state : List.of("IN_PROGRESS", "COMPLETED", "CANCELLED")) {
            task(1L, 3L, state);
            assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        }
        noWrite();
    }
    @Test void cannotCompleteBeforeStartingOrAfterCompletion() {
        for (String state : List.of("PENDING", "COMPLETED", "CANCELLED")) {
            task(1L, 3L, state);
            assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.complete(1L)).getStatusCode().value());
        }
        noWrite();
    }
    @Test void startRecordsServerTimeWithoutOverwritingStartedTask() {
        task(1L, 3L, "PENDING");
        when(jdbc.update(anyString(), eq(1L), eq(3L))).thenReturn(1);
        assertEquals(new TaskProgressResponse(1L, "IN_PROGRESS"), service.start(1L));
        verify(jdbc).update(contains("started_at = SYSUTCDATETIME()"), eq(1L), eq(3L));
        verify(jdbc).update(contains("started_at IS NULL AND completed_at IS NULL"), eq(1L), eq(3L));
    }
    @Test void completionRequiresStartedTaskAndRecordsServerTime() {
        task(1L, 3L, "IN_PROGRESS");
        when(jdbc.update(anyString(), eq(1L), eq(3L))).thenReturn(1);
        assertEquals(new TaskProgressResponse(1L, "COMPLETED"), service.complete(1L));
        verify(jdbc).update(contains("completed_at = SYSUTCDATETIME()"), eq(1L), eq(3L));
        verify(jdbc).update(contains("started_at IS NOT NULL AND completed_at IS NULL"), eq(1L), eq(3L));
    }
    @Test void concurrentChangesOrInconsistentTimestampsReturn409() {
        when(jdbc.update(anyString(), eq(1L), eq(3L))).thenReturn(0);
        task(1L, 3L, "PENDING");
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        task(1L, 3L, "IN_PROGRESS");
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.complete(1L)).getStatusCode().value());
    }
    @Test void controllerRejectsInvalidPaginationAndFilterCodes() {
        var mockedService = mock(MyTaskService.class);
        var controller = new MyTaskController(mockedService);
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(-1, 5, "", "", ""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0, 0, "", "", ""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0, 101, "", "", ""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0, 5, "", "TODO", ""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0, 5, "", "", "Daily Clean"));
        verifyNoInteractions(mockedService);
    }
}
