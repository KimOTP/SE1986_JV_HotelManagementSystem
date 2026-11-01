package com.hotel.hms.operations;

import com.hotel.hms.config.SecurityConfig;
import com.hotel.hms.identity.security.*;
import com.hotel.hms.operations.controller.TaskManagementController;
import com.hotel.hms.operations.security.OperationsIdentity;
import com.hotel.hms.operations.service.TaskManagementService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.cors.*;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitWebConfig(OperationsJwtSecurityTests.Config.class)
@TestPropertySource(properties={"app.jwt.secret-base64=bW9kdWxlLWUtdGVzdC1rZXktb25seS1ub3QtZm9yLXByb2R1Y3Rpb24=", "app.jwt.issuer=module-e-test", "app.jwt.access-token-ttl-seconds=900", "app.jwt.refresh-token-ttl-seconds=3600"})
class OperationsJwtSecurityTests {
    @Configuration @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, OperationsIdentity.class})
    static class Config {
        @Bean AuthUserDetailsService users() { return mock(AuthUserDetailsService.class); }
        @Bean JwtService jwt(JwtProperties properties) { return new JwtService(properties); }
        @Bean TaskManagementService tasks() { return mock(TaskManagementService.class); }
        @Bean TaskManagementController taskController(TaskManagementService tasks) { return new TaskManagementController(tasks); }
        @Bean IdentityController identityController(OperationsIdentity identity) { return new IdentityController(identity); }
        @Bean CorsConfigurationSource corsConfigurationSource() { return new UrlBasedCorsConfigurationSource(); }
    }
    @RestController
    static class IdentityController {
        private final OperationsIdentity identity;
        IdentityController(OperationsIdentity identity) { this.identity = identity; }
        @GetMapping("/api/operations/test-identity") @PreAuthorize("isAuthenticated()")
        public Map<String,Long> current() { return Map.of("id",identity.requireUser().getId()); }
    }
    @Autowired WebApplicationContext context;
    @Autowired JwtService jwt;
    @Autowired JwtProperties properties;
    @Autowired AuthUserDetailsService users;
    @Autowired TaskManagementService tasks;
    MockMvc mvc;
    @BeforeEach void setup() { reset(users,tasks); mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build(); }
    AuthUserDetails user(Long id,String email,String role,String... permissions) {
        var user=mock(AuthUserDetails.class);
        when(user.getId()).thenReturn(id); when(user.getEmail()).thenReturn(email); when(user.isEnabled()).thenReturn(true);
        when(user.getRoles()).thenReturn(Set.of(role)); when(user.getPermissions()).thenReturn(Set.of(permissions));
        var authorities=new ArrayList<org.springframework.security.core.GrantedAuthority>();
        authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_"+role));
        for(var permission:permissions) authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(permission));
        doReturn(authorities).when(user).getAuthorities(); when(users.loadUserByUsername(email)).thenReturn(user);
        return user;
    }
    @Test void anonymousCannotReadAnyOperationsData() throws Exception {
        for (var route : List.of("tasks", "my-tasks", "dashboard", "issues", "issue-rooms", "issue-types", "feedback", "my-feedback", "feedback-bookings", "issue-assignment-context")) {
            mvc.perform(get("/api/operations/"+route)).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(tasks);
    }
    @Test void forgedTokenCannotReadOperationsData() throws Exception {
        mvc.perform(get("/api/operations/tasks").header("Authorization","Bearer not-a-jwt")).andExpect(status().isUnauthorized()); verifyNoInteractions(tasks);
    }
    @Test void signedTokenUsesCurrentAccountNotDemoAccount() throws Exception {
        var first=user(2L,"manager@sba.example","MANAGER","UC-E1");
        var second=user(4L,"housekeeper@sba.example","STAFF","UC-E2");
        mvc.perform(get("/api/operations/test-identity").header("Authorization","Bearer "+jwt.generateAccessToken(first)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(2));
        mvc.perform(get("/api/operations/test-identity").header("Authorization","Bearer "+jwt.generateAccessToken(second)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(4));
    }
    @Test void staffCannotAccessManagerTaskEndpoint() throws Exception {
        var staff=user(4L,"housekeeper@sba.example","STAFF","UC-E2");
        mvc.perform(get("/api/operations/tasks").header("Authorization","Bearer "+jwt.generateAccessToken(staff))).andExpect(status().isForbidden()); verifyNoInteractions(tasks);
    }
    @Test void managerWithUcPermissionCanReadTasks() throws Exception {
        var manager=user(2L,"manager@sba.example","MANAGER","UC-E1"); when(tasks.getTasks(0,12,"","","")).thenReturn(List.of());
        mvc.perform(get("/api/operations/tasks").header("Authorization","Bearer "+jwt.generateAccessToken(manager))).andExpect(status().isOk());
        verify(tasks).getTasks(0,12,"","","");
    }
    @Test void disabledAccountIsRejectedEvenWithValidSignature() throws Exception {
        var staff=user(4L,"housekeeper@sba.example","STAFF","UC-E2");var token=jwt.generateAccessToken(staff);when(staff.isEnabled()).thenReturn(false);
        mvc.perform(get("/api/operations/test-identity").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void tokenUserIdMustMatchDatabaseUser() throws Exception {
        var staff=user(4L,"housekeeper@sba.example","STAFF","UC-E2");var token=jwt.generateAccessToken(staff);when(staff.getId()).thenReturn(99L);
        mvc.perform(get("/api/operations/test-identity").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void expiredTokenIsRejected() throws Exception {
        var staff=user(4L,"housekeeper@sba.example","STAFF","UC-E2");
        var expiredJwt=new JwtService(new JwtProperties(properties.secretBase64(),properties.issuer(),-60,3600));
        mvc.perform(get("/api/operations/test-identity").header("Authorization","Bearer "+expiredJwt.generateAccessToken(staff))).andExpect(status().isUnauthorized());
    }
}
