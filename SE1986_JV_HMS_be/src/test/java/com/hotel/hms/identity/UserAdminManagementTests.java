package com.hotel.hms.identity;

import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.ConflictException;
import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.CreateInternalUserRequest;
import com.hotel.hms.identity.dto.UpdateInternalUserRequest;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.Staff;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.repository.StaffRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.UserAdminServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserAdminManagementTests {

    private final UserRepository users = mock(UserRepository.class);
    private final StaffRepository staff = mock(StaffRepository.class);
    private final AuthTokenRepository tokens = mock(AuthTokenRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final UserAdminServiceImpl service = new UserAdminServiceImpl(users, staff, tokens, encoder, roles);

    private Role role(String code) {
        Role role = new Role();
        role.setCode(code);
        role.setActive(true);
        return role;
    }

    private User user(long id, String roleCode) {
        User user = new User();
        user.setId(id);
        user.setEmail(roleCode.toLowerCase() + id + "@example.test");
        user.setFullName(roleCode);
        user.setActive(true);
        user.setEmailVerified(true);
        user.getRoles().add(role(roleCode));
        return user;
    }

    private AuthUserDetails admin() {
        return AuthUserDetails.from(user(1, "ADMIN"), null);
    }

    @BeforeEach
    void setUp() {
        when(roles.findByCodeAndActiveTrue("MANAGER")).thenReturn(Optional.of(role("MANAGER")));
        when(roles.findByCodeAndActiveTrue("STAFF")).thenReturn(Optional.of(role("STAFF")));
        when(staff.findActiveHotelIds()).thenReturn(List.of(1L));
    }

    private CreateInternalUserRequest createRequest() {
        return new CreateInternalUserRequest("Nguyễn An", "An@Example.TEST", "STAFF", " Lễ tân ", "secret1");
    }

    @Test
    void createWritesUserRoleAndStaff() {
        when(users.saveAndFlush(any())).thenAnswer(call -> {
            call.<User>getArgument(0).setId(12L);
            return call.getArgument(0);
        });

        AdminUserResponse response = service.createInternalUser(admin(), createRequest());

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(savedUser.capture());
        assertEquals("an@example.test", savedUser.getValue().getEmail());
        assertTrue(savedUser.getValue().getEmailVerified());
        assertTrue(encoder.matches("secret1", savedUser.getValue().getPasswordHash()));

        ArgumentCaptor<Staff> savedStaff = ArgumentCaptor.forClass(Staff.class);
        verify(staff).save(savedStaff.capture());
        assertEquals(1L, savedStaff.getValue().getHotelId());
        assertEquals("S012", savedStaff.getValue().getEmployeeCode());
        assertEquals("Lễ tân", savedStaff.getValue().getJobTitle());
        assertTrue(savedStaff.getValue().getActive());

        assertEquals("STAFF", response.role());
        assertTrue(response.enabled());
    }

    @Test
    void createRejectsDuplicateEmailAndConcurrentDuplicate() {
        when(users.existsByEmail("an@example.test")).thenReturn(true);
        assertThrows(ConflictException.class, () -> service.createInternalUser(admin(), createRequest()));
        verify(staff, never()).save(any());

        when(users.existsByEmail("an@example.test")).thenReturn(false);
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));
        assertThrows(ConflictException.class, () -> service.createInternalUser(admin(), createRequest()));
        verify(staff, never()).save(any());
    }

    @Test
    void createDoesNotGuessHotelWhenSeveralExist() {
        when(staff.findActiveHotelIds()).thenReturn(List.of(1L, 2L));

        assertThrows(ConflictException.class, () -> service.createInternalUser(admin(), createRequest()));
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void createUsesHotelOfActorWhenActorIsStaff() {
        Staff actorStaff = new Staff();
        actorStaff.setHotelId(7L);
        AuthUserDetails manager = AuthUserDetails.from(user(2, "MANAGER"), actorStaff);
        when(users.saveAndFlush(any())).thenAnswer(call -> {
            call.<User>getArgument(0).setId(12L);
            return call.getArgument(0);
        });

        service.createInternalUser(manager, createRequest());

        ArgumentCaptor<Staff> savedStaff = ArgumentCaptor.forClass(Staff.class);
        verify(staff).save(savedStaff.capture());
        assertEquals(7L, savedStaff.getValue().getHotelId());
    }

    @Test
    void updateChangesRoleAndKeepsSingleInternalRole() {
        User target = user(3, "STAFF");
        when(users.findById(3L)).thenReturn(Optional.of(target));
        when(staff.findByUser_Id(3L)).thenReturn(Optional.of(new Staff()));

        AdminUserResponse response = service.updateInternalUser(admin(), 3L,
                new UpdateInternalUserRequest("Tên Mới", "moi@example.test", "MANAGER", null));

        assertEquals(List.of("MANAGER"), target.getRoles().stream().map(Role::getCode).toList());
        assertEquals("moi@example.test", target.getEmail());
        assertEquals("MANAGER", response.role());
    }

    @Test
    void cannotChangeOwnRoleButCanEditOwnName() {
        User self = user(2, "MANAGER");
        AuthUserDetails actor = AuthUserDetails.from(self, null);
        when(users.findById(2L)).thenReturn(Optional.of(self));
        when(staff.findByUser_Id(2L)).thenReturn(Optional.of(new Staff()));

        assertThrows(BadRequestException.class, () -> service.updateInternalUser(actor, 2L,
                new UpdateInternalUserRequest("Tên", self.getEmail(), "STAFF", null)));

        service.updateInternalUser(actor, 2L, new UpdateInternalUserRequest("Tên Mới", self.getEmail(), "MANAGER", null));
        assertEquals("Tên Mới", self.getFullName());
    }

    @Test
    void updateRejectsEmailOfAnotherUser() {
        User target = user(3, "STAFF");
        when(users.findById(3L)).thenReturn(Optional.of(target));
        when(users.existsByEmailAndIdNot("taken@example.test", 3L)).thenReturn(true);

        assertThrows(ConflictException.class, () -> service.updateInternalUser(admin(), 3L,
                new UpdateInternalUserRequest("Tên", "taken@example.test", "STAFF", null)));
    }

    @Test
    void adminAndCustomerAreNotManagedHere() {
        when(users.findById(5L)).thenReturn(Optional.of(user(5, "CUSTOMER")));
        when(users.findById(9L)).thenReturn(Optional.of(user(9, "ADMIN")));
        UpdateInternalUserRequest request = new UpdateInternalUserRequest("Tên", "a@example.test", "STAFF", null);

        assertThrows(BadRequestException.class, () -> service.updateInternalUser(admin(), 5L, request));
        assertThrows(BadRequestException.class, () -> service.updateInternalUser(admin(), 9L, request));
        assertThrows(BadRequestException.class, () -> service.setStatus(admin(), 5L, false));
        assertThrows(BadRequestException.class, () -> service.setStatus(admin(), 9L, false));
    }

    @Test
    void lockDisablesStaffAndRevokesSessions() {
        User target = user(3, "STAFF");
        Staff targetStaff = new Staff();
        targetStaff.setActive(true);
        targetStaff.setJobTitle("Lễ tân");
        when(users.findById(3L)).thenReturn(Optional.of(target));
        when(staff.findByUser_Id(3L)).thenReturn(Optional.of(targetStaff));

        AdminUserResponse response = service.setStatus(admin(), 3L, false);

        assertFalse(target.getActive());
        assertFalse(targetStaff.getActive());
        assertFalse(response.enabled());
        assertEquals("Lễ tân", response.jobTitle());
        verify(tokens).revokeAllActive(eq(3L), eq(TokenPurpose.REFRESH), any());
    }

    @Test
    void unlockEnablesStaffWithoutTouchingTokens() {
        User target = user(3, "STAFF");
        target.setActive(false);
        Staff targetStaff = new Staff();
        targetStaff.setActive(false);
        when(users.findById(3L)).thenReturn(Optional.of(target));
        when(staff.findByUser_Id(3L)).thenReturn(Optional.of(targetStaff));

        service.setStatus(admin(), 3L, true);

        assertTrue(target.getActive());
        assertTrue(targetStaff.getActive());
        verifyNoInteractions(tokens);
    }

    @Test
    void cannotLockSelf() {
        assertThrows(BadRequestException.class, () -> service.setStatus(admin(), 1L, false));
        verify(users, never()).findById(any());
    }
}
