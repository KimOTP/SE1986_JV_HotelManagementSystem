package com.hotel.hms.operations;
import com.hotel.hms.operations.repository.*;

import com.hotel.hms.common.exception.GlobalExceptionHandler;
import com.hotel.hms.config.SecurityConfig;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.Permission;
import com.hotel.hms.identity.security.*;
import com.hotel.hms.operations.controller.FeedbackController;
import com.hotel.hms.operations.security.OperationsIdentity;
import com.hotel.hms.operations.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.cors.*;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import javax.sql.DataSource;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Opt-in HTTP/controller/service/JDBC tests on a dedicated SQL Server database.
 * Every fixture and write is rolled back. JWT signature/filter are real; Module A's
 * principal lookup is stubbed to fixture accounts. Does not test password login or browser UI.
 */
@EnabledIfEnvironmentVariable(named="OPERATIONS_TEST_JDBC_URL", matches=".+")
@SpringJUnitWebConfig(FeedbackSqlServerTests.Config.class)
@TestPropertySource(properties={"app.jwt.issuer=module-e-sql-test", "app.jwt.access-token-ttl-seconds=900", "app.jwt.refresh-token-ttl-seconds=3600"})
@Transactional
class FeedbackSqlServerTests {
    @Configuration @EnableWebMvc @EnableTransactionManagement(proxyTargetClass=true)
    @Import({SecurityConfig.class,JwtAuthenticationFilter.class,OperationsIdentity.class,
            IssueAssignmentService.class,FeedbackService.class,FeedbackController.class,GlobalExceptionHandler.class})
    @ComponentScan("com.hotel.hms.operations.repository")
    static class Config {
        @Bean DataSource dataSource() {
            var source=new DriverManagerDataSource(System.getenv("OPERATIONS_TEST_JDBC_URL"),
                    System.getenv("OPERATIONS_TEST_USERNAME"),System.getenv("OPERATIONS_TEST_PASSWORD"));
            // Verify the real connection before any transaction or fixture write. Never fall back to DB_*.
            var database=new JdbcTemplate(source).queryForObject("SELECT DB_NAME()",String.class);
            if(database==null || !database.endsWith("_module_e_test"))
                throw new IllegalArgumentException("Dedicated database name must end with _module_e_test");
            return source;
        }
        @Bean JdbcTemplate jdbc(DataSource source) { return new JdbcTemplate(source); }
        @Bean PlatformTransactionManager transactionManager(DataSource source) { return new DataSourceTransactionManager(source); }
        @Bean AuthUserDetailsService users() { return mock(AuthUserDetailsService.class); }
        @Bean JwtService jwt(JwtProperties properties) { return new JwtService(properties); }
        @Bean CorsConfigurationSource corsConfigurationSource() { return new UrlBasedCorsConfigurationSource(); }
    }
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtService jwt;
    @Autowired AuthUserDetailsService users;
    MockMvc mvc;
    long hotel,otherHotel,customerId,otherCustomerId,managerId,otherManagerId,booking;
    String customerToken,otherCustomerToken,managerToken,otherManagerToken;
    @BeforeEach void fixture() {
        AuthUserDetailsService lookup=org.springframework.test.util.AopTestUtils.getUltimateTargetObject(users);
        reset(lookup);
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        jdbc.execute("SET QUOTED_IDENTIFIER ON");
        hotel=id("INSERT identity_access.hotels(name,address) VALUES(N'Module E test',N'Test only')");
        otherHotel=id("INSERT identity_access.hotels(name,address) VALUES(N'Other hotel',N'Test only')");
        customerId=account("CUSTOMER",hotel,"customer-one");otherCustomerId=account("CUSTOMER",hotel,"customer-two");
        managerId=account("MANAGER",hotel,"manager-one");otherManagerId=account("MANAGER",otherHotel,"manager-two");
        customerToken=token(customerId,"CUSTOMER");otherCustomerToken=token(otherCustomerId,"CUSTOMER");
        managerToken=token(managerId,"MANAGER");otherManagerToken=token(otherManagerId,"MANAGER");
        booking=booking(customerId,"CHECKED_OUT");
    }
    long id(String sql,Object... values) {
        return Objects.requireNonNull(jdbc.queryForObject("SET NOCOUNT ON; "+sql+"; SELECT CONVERT(BIGINT,SCOPE_IDENTITY())",Long.class,values));
    }
    long account(String role,long hotelId,String label) {
        String email=label+"-"+UUID.randomUUID()+"@example.invalid";
        long user=id("INSERT identity_access.users(full_name,email,password_hash,email_verified) VALUES(?,?,'test-only-unused',1)",label,email);
        var roles=jdbc.queryForList("SELECT role_id FROM identity_access.roles WHERE code=?",Long.class,role);
        long roleId=roles.isEmpty()?id("INSERT identity_access.roles(code,name) VALUES(?,?)",role,role):roles.getFirst();
        jdbc.update("INSERT identity_access.user_roles(user_id,role_id) VALUES(?,?)",user,roleId);
        if(role.equals("MANAGER")) jdbc.update("INSERT identity_access.staff(user_id,hotel_id,employee_code) VALUES(?,?,?)",user,hotelId,"T-"+UUID.randomUUID().toString().substring(0,20));
        return user;
    }
    String token(long userId,String roleCode) {
        var user=new User();user.setId(userId);user.setFullName("Fixture "+userId);
        user.setEmail(jdbc.queryForObject("SELECT email FROM identity_access.users WHERE user_id=?",String.class,userId));
        user.setActive(true);user.setEmailVerified(true);user.setPasswordHash("test-only-unused");
        var permission=new Permission();permission.setCode("UC-E6");
        var role=new Role();role.setCode(roleCode);role.setActive(true);role.setPermissions(Set.of(permission));user.setRoles(Set.of(role));
        var principal=AuthUserDetails.from(user,null);AuthUserDetailsService lookup=org.springframework.test.util.AopTestUtils.getUltimateTargetObject(users);
        when(lookup.loadUserByUsername(user.getEmail())).thenReturn(principal);
        return jwt.generateAccessToken(principal);
    }
    long booking(long owner,String status) {
        return id("""
                INSERT booking.bookings(booking_code,customer_id,hotel_id,check_in_date,check_out_date,guest_count,status,
                  contact_name,contact_email,contact_phone)
                VALUES(?,?,?,'2035-01-10','2035-01-12',1,?,N'Test','test@example.invalid','0')
                ""","E-"+UUID.randomUUID().toString().substring(0,20),owner,hotel,status);
    }
    String body(long bookingId,int rating,String comment) {
        return "{\"bookingId\":"+bookingId+",\"rating\":"+rating+",\"comment\":\""+comment+"\"}";
    }
    long create() throws Exception {
        mvc.perform(post("/api/operations/feedback").header("Authorization","Bearer "+customerToken)
                .contentType("application/json").content(body(booking,5,"Phòng rất sạch sẽ")))
                .andExpect(status().isCreated());
        return jdbc.queryForObject("SELECT feedback_id FROM operations.feedback WHERE booking_id=?",Long.class,booking);
    }
    @Test void customerSubmitManagerReplyCustomerReloadPersistsUnicodeAndActors() throws Exception {
        mvc.perform(get("/api/operations/feedback-bookings").header("Authorization","Bearer "+customerToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(booking));
        long feedback=create();
        assertEquals(customerId,jdbc.queryForObject("SELECT customer_id FROM operations.feedback WHERE feedback_id=?",Long.class,feedback));
        mvc.perform(get("/api/operations/feedback-bookings").header("Authorization","Bearer "+customerToken))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(patch("/api/operations/feedback/"+feedback+"/reply").header("Authorization","Bearer "+managerToken)
                .contentType("application/json").content("{\"reply\":\"Cảm ơn quý khách đã đánh giá\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/operations/my-feedback").header("Authorization","Bearer "+customerToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].comment").value("Phòng rất sạch sẽ"))
                .andExpect(jsonPath("$[0].reply").value("Cảm ơn quý khách đã đánh giá"));
        assertEquals(managerId,jdbc.queryForObject("SELECT replied_by FROM operations.feedback WHERE feedback_id=?",Long.class,feedback));
        assertNotNull(jdbc.queryForObject("SELECT replied_at FROM operations.feedback WHERE feedback_id=?",java.sql.Timestamp.class,feedback));
    }
    @Test void anotherCustomerCannotSubmitOrReadOwnersFeedback() throws Exception {
        mvc.perform(post("/api/operations/feedback").header("Authorization","Bearer "+otherCustomerToken)
                .contentType("application/json").content(body(booking,5,"Must be forbidden"))).andExpect(status().isForbidden());
        create();
        mvc.perform(get("/api/operations/my-feedback").header("Authorization","Bearer "+otherCustomerToken))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void managerFromAnotherHotelCannotReadOrReply() throws Exception {
        long feedback=create();
        mvc.perform(get("/api/operations/feedback").header("Authorization","Bearer "+otherManagerToken))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(patch("/api/operations/feedback/"+feedback+"/reply").header("Authorization","Bearer "+otherManagerToken)
                .contentType("application/json").content("{\"reply\":\"Must be forbidden\"}")).andExpect(status().isForbidden());
        assertNull(jdbc.queryForObject("SELECT reply FROM operations.feedback WHERE feedback_id=?",String.class,feedback));
    }
    @Test void duplicateSubmissionAndSecondReplyAreRejected() throws Exception {
        long feedback=create();
        mvc.perform(post("/api/operations/feedback").header("Authorization","Bearer "+customerToken)
                .contentType("application/json").content(body(booking,4,"Do not duplicate"))).andExpect(status().isConflict());
        for(int i=0;i<2;i++) mvc.perform(patch("/api/operations/feedback/"+feedback+"/reply").header("Authorization","Bearer "+managerToken)
                .contentType("application/json").content("{\"reply\":\"Original manager reply\"}"))
                .andExpect(i==0?status().isOk():status().isConflict());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM operations.feedback WHERE booking_id=?",Integer.class,booking));
    }
    @Test void uncompletedBookingAndInvalidRatingsCannotCreateFeedback() throws Exception {
        long confirmed=booking(customerId,"CONFIRMED");
        mvc.perform(post("/api/operations/feedback").header("Authorization","Bearer "+customerToken)
                .contentType("application/json").content(body(confirmed,5,"Not checked out yet"))).andExpect(status().isConflict());
        mvc.perform(post("/api/operations/feedback").header("Authorization","Bearer "+customerToken)
                .contentType("application/json").content(body(booking,0,"Invalid rating test"))).andExpect(status().isBadRequest());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM operations.feedback",Integer.class));
    }
}
