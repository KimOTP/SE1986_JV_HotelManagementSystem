package com.hotel.hms.operations;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.context.annotation.*;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.transaction.annotation.Transactional;
import com.hotel.hms.operations.service.*;
import com.hotel.hms.operations.controller.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Regression checks for linked work introduced by the newer main branch. Writes are rolled back. */
@EnabledIfEnvironmentVariable(named="OPERATIONS_TEST_JDBC_URL",matches=".+")
@SpringJUnitWebConfig(OperationsLinkedWorkRegressionTests.Config.class)
@Transactional
class OperationsLinkedWorkRegressionTests extends OperationsFollowUpSqlServerTests {
 @Configuration @Import({OperationsFollowUpSqlServerTests.Config.class,MyTaskService.class,MyTaskController.class,IssueProgressController.class,IssueProgressService.class})
 static class Config {}
 @BeforeEach void linkWork(TestInfo info){if(info.getTestMethod().orElseThrow().getDeclaringClass()!=OperationsLinkedWorkRegressionTests.class)return; jdbc.update("UPDATE operations.tasks SET issue_id=? WHERE task_id=?",issue,task);}
 void handover(boolean isIssue,long id) throws Exception {
  mvc.perform(patch("/api/operations/"+(isIssue?"issues":"tasks")+"/"+id+"/management")
   .header("Authorization","Bearer "+managerToken).contentType("application/json")
   .content("{\"version\":\""+version(isIssue,id)+"\",\"action\":\"REASSIGN\",\"staffId\":"+workerTwo+",\"reason\":\"Bàn giao ca trực\"}"))
   .andExpect(status().isNoContent());
 }
 @Test void issueHandoverMustAlsoMoveLinkedTaskOwner() throws Exception {
  handover(true,issue);
  assertEquals(workerTwo,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.tasks WHERE task_id=?",Long.class,task),"Linked task must follow issue handover");
 }
 @Test void taskHandoverMustAlsoMoveLinkedIssueOwner() throws Exception {
  handover(false,task);
  assertEquals(workerTwo,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.issues WHERE issue_id=?",Long.class,issue),"Linked issue must follow task handover");
 }
 String workerToken(){ return workerToken(workerOne); }
 String workerToken(long workerStaff){
  long userId=jdbc.queryForObject("SELECT user_id FROM identity_access.staff WHERE staff_id=?",Long.class,workerStaff);
  var user=new com.hotel.hms.identity.entity.User();user.setId(userId);user.setFullName("Worker one");user.setEmail(jdbc.queryForObject("SELECT email FROM identity_access.users WHERE user_id=?",String.class,userId));user.setActive(true);user.setEmailVerified(true);user.setPasswordHash("unused");
  var permissions=new java.util.HashSet<com.hotel.hms.identity.entity.Permission>();for(var code:java.util.List.of("UC-E2","UC-E5")){var permission=new com.hotel.hms.identity.entity.Permission();permission.setCode(code);permissions.add(permission);}
  var role=new com.hotel.hms.identity.entity.Role();role.setCode("HOUSEKEEPER");role.setActive(true);role.setPermissions(permissions);user.setRoles(java.util.Set.of(role));
  var principal=com.hotel.hms.identity.security.AuthUserDetails.from(user,null);com.hotel.hms.identity.security.AuthUserDetailsService lookup=org.springframework.test.util.AopTestUtils.getUltimateTargetObject(users);org.mockito.Mockito.when(lookup.loadUserByUsername(user.getEmail())).thenReturn(principal);return jwt.generateAccessToken(principal);
 }
 @Test void formerAssigneeCannotStartLinkedTaskAfterIssueHandover() throws Exception {
  handover(true,issue);
  mvc.perform(patch("/api/operations/my-tasks/"+task+"/start").header("Authorization","Bearer "+workerToken())).andExpect(status().is4xxClientError());
 }
 @Test void completingLinkedTaskResolvesIssueAndKeepsOwners() throws Exception {
   String jwt=workerToken();
   mvc.perform(patch("/api/operations/my-tasks/"+task+"/start").header("Authorization","Bearer "+jwt)).andExpect(status().isOk());
   assertEquals("IN_PROGRESS",jdbc.queryForObject("SELECT status FROM operations.issues WHERE issue_id=?",String.class,issue));
   mvc.perform(patch("/api/operations/my-tasks/"+task+"/complete").header("Authorization","Bearer "+jwt)).andExpect(status().isOk());
   assertEquals("RESOLVED",jdbc.queryForObject("SELECT status FROM operations.issues WHERE issue_id=?",String.class,issue));
   assertEquals("COMPLETED",jdbc.queryForObject("SELECT status FROM operations.tasks WHERE task_id=?",String.class,task));
 }
 @Test void resolvingIssueCompletesLinkedTask() throws Exception {
   String jwt=workerToken();
   mvc.perform(patch("/api/operations/issues/"+issue+"/start").header("Authorization","Bearer "+jwt)).andExpect(status().isOk());
   mvc.perform(patch("/api/operations/issues/"+issue+"/resolve").header("Authorization","Bearer "+jwt).contentType("application/json").content("{\"resolutionNote\":\"Đã sửa xong thiết bị\"}")).andExpect(status().isOk());
   assertEquals("COMPLETED",jdbc.queryForObject("SELECT status FROM operations.tasks WHERE task_id=?",String.class,task));
 }
 @Test void linkedTaskCannotBeCancelledSeparately() throws Exception {
   mvc.perform(patch("/api/operations/tasks/"+task+"/management").header("Authorization","Bearer "+managerToken).contentType("application/json").content("{\"version\":\""+version(false,task)+"\",\"action\":\"CANCEL\",\"reason\":\"Không hủy riêng sự cố\"}")).andExpect(status().isConflict());
   assertEquals("PENDING",jdbc.queryForObject("SELECT status FROM operations.tasks WHERE task_id=?",String.class,task));
   assertEquals("ASSIGNED",jdbc.queryForObject("SELECT status FROM operations.issues WHERE issue_id=?",String.class,issue));
 }
 @Test void bothSidesReceiveHandoverHistory() throws Exception {
   handover(true,issue);
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM operations.work_history WHERE work_type='ISSUE' AND work_id=?",Integer.class,issue));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM operations.work_history WHERE work_type='TASK' AND work_id=?",Integer.class,task));
 }
 @Test void inconsistentExistingPairCannotBeAdvanced() throws Exception {
   jdbc.update("UPDATE operations.tasks SET assigned_staff_id=? WHERE task_id=?",workerTwo,task);
   mvc.perform(patch("/api/operations/issues/"+issue+"/start").header("Authorization","Bearer "+workerToken())).andExpect(status().isConflict());
   assertEquals("ASSIGNED",jdbc.queryForObject("SELECT status FROM operations.issues WHERE issue_id=?",String.class,issue));
 }

 @Test void newWorkerCanStartAfterPendingHandoverAndOldWorkerCannot() throws Exception {
   String oldJwt=workerToken();
   handover(false,task);
   mvc.perform(patch("/api/operations/my-tasks/"+task+"/start").header("Authorization","Bearer "+oldJwt)).andExpect(status().isForbidden());
   String newJwt=workerToken(workerTwo);
   mvc.perform(patch("/api/operations/my-tasks/"+task+"/start").header("Authorization","Bearer "+newJwt)).andExpect(status().isOk());
   mvc.perform(patch("/api/operations/my-tasks/"+task+"/complete").header("Authorization","Bearer "+newJwt)).andExpect(status().isOk());
   assertEquals("RESOLVED",jdbc.queryForObject("SELECT status FROM operations.issues WHERE issue_id=?",String.class,issue));
   assertEquals(workerTwo,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.tasks WHERE task_id=?",Long.class,task));
 }
 @Test void startingWorkBlocksHandoverFromEitherScreenEvenWithOldForm() throws Exception {
   String taskVersion=version(false,task),issueVersion=version(true,issue);
   mvc.perform(patch("/api/operations/my-tasks/"+task+"/start").header("Authorization","Bearer "+workerToken())).andExpect(status().isOk());
   for(boolean fromIssue:java.util.List.of(false,true)) {
    mvc.perform(patch("/api/operations/"+(fromIssue?"issues":"tasks")+"/"+(fromIssue?issue:task)+"/management").header("Authorization","Bearer "+managerToken).contentType("application/json").content("{\"version\":\""+(fromIssue?issueVersion:taskVersion)+"\",\"action\":\"REASSIGN\",\"staffId\":"+workerTwo+",\"reason\":\"Đổi người xử lý\"}")).andExpect(status().isConflict());
   }
   assertEquals(workerOne,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.tasks WHERE task_id=?",Long.class,task));
   assertEquals(workerOne,jdbc.queryForObject("SELECT assigned_staff_id FROM operations.issues WHERE issue_id=?",Long.class,issue));
   assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM operations.work_history WHERE work_type='TASK' AND work_id=?",Integer.class,task));
   mvc.perform(get("/api/operations/tasks/"+task+"/management").header("Authorization","Bearer "+managerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.canChange").value(false));
 }


}
