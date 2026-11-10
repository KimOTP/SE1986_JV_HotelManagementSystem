package com.hotel.hms.operations;
import com.hotel.hms.operations.service.OperationsFollowUpService;
import com.hotel.hms.operations.controller.OperationsFollowUpController;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@EnabledIfEnvironmentVariable(named="OPERATIONS_TEST_JDBC_URL",matches=".+")
@SpringJUnitWebConfig(OperationsFollowUpSqlServerTests.Config.class)
@Transactional
class OperationsFollowUpSqlServerTests extends FeedbackSqlServerTests {
 @Configuration @Import({FeedbackSqlServerTests.Config.class,OperationsFollowUpService.class,OperationsFollowUpController.class})
 static class Config {}
 @Autowired OperationsFollowUpService followUp;
 long task,issue,workerOne,workerTwo;
 @BeforeEach void workFixture(){
   long first=account("HOUSEKEEPER",hotel,"worker-one"),second=account("HOUSEKEEPER",hotel,"worker-two");
   jdbc.update("INSERT identity_access.staff(user_id,hotel_id,employee_code) VALUES(?,?,?)",first,hotel,"W-"+java.util.UUID.randomUUID().toString().substring(0,20));
   jdbc.update("INSERT identity_access.staff(user_id,hotel_id,employee_code) VALUES(?,?,?)",second,hotel,"W-"+java.util.UUID.randomUUID().toString().substring(0,20));
   workerOne=jdbc.queryForObject("SELECT staff_id FROM identity_access.staff WHERE user_id=?",Long.class,first);
   workerTwo=jdbc.queryForObject("SELECT staff_id FROM identity_access.staff WHERE user_id=?",Long.class,second);
   long type=id("INSERT inventory.room_types(hotel_id,name,base_price,max_guests) VALUES(?,'Test',500000,2)",hotel);
   long room=id("INSERT inventory.rooms(room_type_id,room_number,floor_number) VALUES(?,'T101',1)",type);
   task=id("INSERT operations.tasks(room_id,assigned_staff_id,assigned_by,task_type,title,status,scheduled_at) VALUES(?,?,?,'CLEANING','Test task','PENDING',SYSUTCDATETIME())",room,workerOne,managerId);
   issue=id("INSERT operations.issues(room_id,issue_type_id,reported_by,assigned_staff_id,assigned_by,title,description,status) VALUES(?,?,?,?,?,'Test issue','Reported by customer','ASSIGNED')",room,id("INSERT operations.issue_types(name) VALUES('Test type')"),customerId,workerOne,managerId);
 }
 @Override String token(long userId,String roleCode) {
   var user=new com.hotel.hms.identity.entity.User();user.setId(userId);user.setFullName("Fixture "+userId);
   user.setEmail(jdbc.queryForObject("SELECT email FROM identity_access.users WHERE user_id=?",String.class,userId));
   user.setActive(true);user.setEmailVerified(true);user.setPasswordHash("unused");
   var permissions=new java.util.HashSet<com.hotel.hms.identity.entity.Permission>();
   for(var code:roleCode.equals("CUSTOMER")?java.util.List.of("UC-E4","UC-E6"):java.util.List.of("UC-E1","UC-E4","UC-E5","UC-E6")){var permission=new com.hotel.hms.identity.entity.Permission();permission.setCode(code);permissions.add(permission);}
   var role=new com.hotel.hms.identity.entity.Role();role.setCode(roleCode);role.setActive(true);role.setPermissions(permissions);user.setRoles(java.util.Set.of(role));
   var principal=com.hotel.hms.identity.security.AuthUserDetails.from(user,null);
   com.hotel.hms.identity.security.AuthUserDetailsService lookup=org.springframework.test.util.AopTestUtils.getUltimateTargetObject(users);
   org.mockito.Mockito.when(lookup.loadUserByUsername(user.getEmail())).thenReturn(principal);
   return jwt.generateAccessToken(principal);
 }
 String version(boolean isIssue,long id){return jdbc.queryForObject("SELECT CONVERT(varchar(18),CONVERT(varbinary(8),row_version),1) FROM operations."+(isIssue?"issues WHERE issue_id=?":"tasks WHERE task_id=?"),String.class,id);}
 @Test void reassignThenCancelViaHttpKeepsAuditAndRejectsStaleVersion() throws Exception {
   String old=version(false,task);
   mvc.perform(patch("/api/operations/tasks/"+task+"/management").header("Authorization","Bearer "+managerToken).contentType("application/json").content("{\"version\":\""+old+"\",\"action\":\"REASSIGN\",\"staffId\":"+workerTwo+",\"reason\":\"Nhân viên nghỉ ca\"}")).andDo(result -> { if(result.getResponse().getStatus()!=204) System.out.println("Follow-up response: "+result.getResolvedException()); }).andExpect(status().isNoContent());
   assertEquals(workerTwo,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.tasks WHERE task_id=?",Long.class,task));
   mvc.perform(patch("/api/operations/tasks/"+task+"/management").header("Authorization","Bearer "+managerToken).contentType("application/json").content("{\"version\":\""+old+"\",\"action\":\"CANCEL\",\"reason\":\"Hủy việc trùng\"}")).andExpect(status().isConflict());
   String fresh=version(false,task);
   mvc.perform(patch("/api/operations/tasks/"+task+"/management").header("Authorization","Bearer "+managerToken).contentType("application/json").content("{\"version\":\""+fresh+"\",\"action\":\"CANCEL\",\"reason\":\"Hủy việc trùng\"}")).andDo(result -> { if(result.getResponse().getStatus()!=204) System.out.println("Follow-up response: "+String.valueOf(result.getResolvedException())); }).andExpect(status().isNoContent());
   assertEquals("CANCELLED",jdbc.queryForObject("SELECT status FROM operations.tasks WHERE task_id=?",String.class,task));
   assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM operations.work_history WHERE work_type='TASK' AND work_id=?",Integer.class,task));
   mvc.perform(get("/api/operations/tasks/"+task+"/management").header("Authorization","Bearer "+managerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.canChange").value(false)).andExpect(jsonPath("$.history.length()").value(2));
 }
 @Test void ownReportsCannotLeakToOtherCustomers() throws Exception {
   mvc.perform(get("/api/operations/my-issue-reports").header("Authorization","Bearer "+customerToken)).andExpect(status().isOk()).andExpect(jsonPath("$[0].title").value("Test issue"));
   mvc.perform(get("/api/operations/my-issue-reports").header("Authorization","Bearer "+otherCustomerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
   mvc.perform(get("/api/operations/issues/"+issue+"/management").header("Authorization","Bearer "+customerToken)).andExpect(status().isForbidden());
 }
 @Test void inProgressIssueCannotBeHandedOver() throws Exception {
   jdbc.update("UPDATE operations.issues SET status='IN_PROGRESS' WHERE issue_id=?",issue);
   mvc.perform(patch("/api/operations/issues/"+issue+"/management").header("Authorization","Bearer "+managerToken).contentType("application/json").content("{\"version\":\""+version(true,issue)+"\",\"action\":\"REASSIGN\",\"staffId\":"+workerTwo+",\"reason\":\"Bàn giao ca trực\"}")).andExpect(status().isConflict());
   assertEquals("IN_PROGRESS",jdbc.queryForObject("SELECT status FROM operations.issues WHERE issue_id=?",String.class,issue));
   assertEquals(workerOne,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.issues WHERE issue_id=?",Long.class,issue));
 }

}
