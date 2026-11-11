package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.repository.IssueAssignmentRepository;
import com.hotel.hms.operations.repository.TaskManagementRepository;
import com.hotel.hms.operations.repository.TaskManagementRepository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TaskManagementService {
    private final TaskManagementRepository persistence;
    private final IssueAssignmentService managerContext;

    public TaskManagementService(
            TaskManagementRepository persistence, IssueAssignmentService managerContext) {
        this.persistence = persistence;
        this.managerContext = managerContext;
    }

    private RoomState requireRoom(Long id, IssueAssignmentRepository.Manager manager) {
        var rooms = persistence.findActiveRoom(id);
        if (rooms.isEmpty())
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Room is missing or inactive");
        var room = rooms.getFirst();
        managerContext.assertScope(manager, room.hotelId());
        return room;
    }

    public List<TaskRoomResponse> getRooms() {
        var manager = managerContext.requireManager();
        return persistence.findRooms(manager.admin() ? 1 : 0, manager.id());
    }

    private List<IssueAssigneeResponse> staffForHotel(Long hotelId) {
        return persistence.findStaff(hotelId);
    }

    public List<IssueAssigneeResponse> getAssignees(Long roomId) {
        var manager = managerContext.requireManager();
        var room = requireRoom(roomId, manager);
        return staffForHotel(room.hotelId());
    }

    public List<ManagedTaskResponse> getTasks(
            int page, int size, String room, String status, String type) {
        var manager = managerContext.requireManager();
        return persistence.findTasks(
                manager.admin() ? 1 : 0, manager.id(), page, size, room, status, type);
    }

    @Transactional
    public TaskProgressResponse create(CreateTaskRequest request) {
        var manager = managerContext.requireManager();
        var room = requireRoom(request.roomId(), manager);
        if (staffForHotel(room.hotelId()).stream()
                .noneMatch(staff -> staff.id().equals(request.staffId()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Staff must be active and belong to the selected room hotel");
        }
        Long id = persistence.insert(request, manager.id());
        return new TaskProgressResponse(id, "PENDING");
    }
}
