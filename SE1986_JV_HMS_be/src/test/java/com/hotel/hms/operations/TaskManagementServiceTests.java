package com.hotel.hms.operations;
import com.hotel.hms.operations.repository.*;

import com.hotel.hms.operations.controller.TaskManagementController;
import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class TaskManagementServiceTests {
    private JdbcTemplate jdbc;
    private IssueAssignmentService identity;
    private TaskManagementService service;
    private final LocalDateTime schedule = LocalDateTime.of(2026, 10, 31, 12, 0);
    @BeforeEach void setup() {
        jdbc = mock(JdbcTemplate.class);
        identity = mock(IssueAssignmentService.class);
        when(identity.requireManager()).thenReturn(new IssueAssignmentRepository.Manager(2L, "Manager Demo", false));
        service = new TaskManagementService(new TaskManagementRepository(jdbc), identity);
    }
    private CreateTaskRequest request() {
        return new CreateTaskRequest(3L, 3L, "CLEANING", "  Dọn phòng 103  ", "  Lau cửa sổ  ", "HIGH", schedule);
    }
    private void room() {
        when(jdbc.query(contains("SELECT r.room_id, rt.hotel_id"), org.mockito.ArgumentMatchers.<RowMapper<TaskManagementRepository.RoomState>>any(), eq(3L)))
                .thenReturn(List.of(new TaskManagementRepository.RoomState(3L, 1L)));
    }
    private void staff(List<IssueAssigneeResponse> items) {
        when(jdbc.query(contains("SELECT s.staff_id"), org.mockito.ArgumentMatchers.<RowMapper<IssueAssigneeResponse>>any(), eq(1L))).thenReturn(items);
    }
    private void noInsert() { verify(jdbc, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class)); }
    @Test void missingManagerBlocksReadsAndWrites() {
        when(identity.requireManager()).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));
        assertThrows(ResponseStatusException.class, () -> service.getRooms());
        assertThrows(ResponseStatusException.class, () -> service.getTasks(0,12,"","",""));
        assertThrows(ResponseStatusException.class, () -> service.getAssignees(3L));
        assertThrows(ResponseStatusException.class, () -> service.create(request()));
        verifyNoInteractions(jdbc);
    }
    @Test void roomsAreScopedToServerManagerOrAdmin() {
        var expected = List.of(new TaskRoomResponse(3L, "103", "SBA Hotel"));
        when(jdbc.query(contains("h.name AS hotel_name"), org.mockito.ArgumentMatchers.<RowMapper<TaskRoomResponse>>any(), eq(0), eq(2L))).thenReturn(expected);
        assertEquals(expected, service.getRooms());
        when(identity.requireManager()).thenReturn(new IssueAssignmentRepository.Manager(1L, "Admin", true));
        service.getRooms();
        verify(jdbc).query(contains("ms.hotel_id = rt.hotel_id"), org.mockito.ArgumentMatchers.<RowMapper<TaskRoomResponse>>any(), eq(1), eq(1L));
    }
    @Test void missingOrInactiveRoomPreventsCreation() {
        when(jdbc.query(contains("SELECT r.room_id, rt.hotel_id"), org.mockito.ArgumentMatchers.<RowMapper<TaskManagementRepository.RoomState>>any(), eq(3L))).thenReturn(List.of());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(request())).getStatusCode().value());
        noInsert();
    }
    @Test void managerCannotCreateOrSelectStaffOutsideHotelScope() {
        room();
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(identity).assertScope(any(), eq(1L));
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.getAssignees(3L)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.create(request())).getStatusCode().value());
        noInsert();
    }
    @Test void rejectsInactiveOrWrongHotelStaff() {
        room(); staff(List.of(new IssueAssigneeResponse(2L, "Other Staff", "H002")));
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(request())).getStatusCode().value());
        noInsert();
    }
    @Test void assigneeListUsesHotelOfSelectedRoom() {
        room();
        var expected = List.of(new IssueAssigneeResponse(3L, "Housekeeper Demo", "H001"));
        staff(expected);
        assertEquals(expected, service.getAssignees(3L));
        verify(identity).assertScope(any(), eq(1L));
    }
    @Test void managerListFiltersAndPaginatesWithinHotelScope() {
        service.getTasks(2, 12, " 103 ", "PENDING", "CLEANING");
        verify(jdbc).query(contains("OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"), org.mockito.ArgumentMatchers.<RowMapper<ManagedTaskResponse>>any(),
                eq(0), eq(2L), eq("103"), eq("103"), eq("PENDING"), eq("PENDING"), eq("CLEANING"), eq("CLEANING"), eq(24L), eq(12));
    }
    @Test void creationBindsManagerUnicodeScheduleAndReturnsGeneratedId() throws Exception {
        room(); staff(List.of(new IssueAssigneeResponse(3L, "Housekeeper Demo", "H001")));
        var connection = mock(Connection.class);
        var statement = mock(PreparedStatement.class);
        when(connection.prepareStatement(contains("'PENDING'"), eq(Statement.RETURN_GENERATED_KEYS))).thenReturn(statement);
        when(jdbc.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(invocation -> {
            PreparedStatementCreator creator = invocation.getArgument(0);
            assertSame(statement, creator.createPreparedStatement(connection));
            KeyHolder holder = invocation.getArgument(1);
            holder.getKeyList().add(new HashMap<>(Map.of("task_id", 15L)));
            return 1;
        });
        assertEquals(new TaskProgressResponse(15L, "PENDING"), service.create(request()));
        verify(statement).setLong(1, 3L); verify(statement).setLong(2, 3L); verify(statement).setLong(3, 2L);
        verify(statement).setString(4, "CLEANING"); verify(statement).setNString(5, "Dọn phòng 103");
        verify(statement).setNString(6, "Lau cửa sổ"); verify(statement).setString(7, "HIGH");
        verify(statement).setTimestamp(8, Timestamp.valueOf(schedule));
    }
    @Test void validationRejectsMissingFieldsInvalidEnumsLengthsAndSqlDateRange() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(request()).isEmpty());
            assertFalse(validator.validate(new CreateTaskRequest(null, 0L, "INVALID", "   ", null, "BAD", null)).isEmpty());
            assertFalse(validator.validate(new CreateTaskRequest(3L, 3L, "CLEANING", "a".repeat(201), "b".repeat(2001), "HIGH", schedule)).isEmpty());
            assertFalse(validator.validate(new CreateTaskRequest(3L, 3L, "CLEANING", "Title", null, "HIGH", schedule.withYear(10000))).isEmpty());
            assertNull(new CreateTaskRequest(3L, 3L, "CLEANING", "Title", "  ", "NORMAL", schedule).description());
        }
    }
    @Test void controllerRejectsInvalidFiltersBeforeQuerying() {
        var mockService = mock(TaskManagementService.class);
        var controller = new TaskManagementController(mockService);
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(-1,12,"","",""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0,101,"","",""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0,12,"","TODO",""));
        assertThrows(ResponseStatusException.class, () -> controller.getTasks(0,12,"","","Daily Clean"));
        verifyNoInteractions(mockService);
    }
}
