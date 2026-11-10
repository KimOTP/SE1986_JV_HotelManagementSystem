package com.hotel.hms.operations.service;

import com.hotel.hms.operations.security.OperationsIdentity;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.springframework.http.HttpStatus.*;

@Service
@Transactional(readOnly=true)
public class OperationsFollowUpService {
 private final JdbcTemplate jdbc;
 private final OperationsIdentity identity;
 private final IssueAssignmentService managers;
 public OperationsFollowUpService(JdbcTemplate jdbc, OperationsIdentity identity, IssueAssignmentService managers) { this.jdbc=jdbc; this.identity=identity; this.managers=managers; }
 public record Change(@NotBlank @Pattern(regexp="0x[0-9A-Fa-f]{16}") String version,
   @NotBlank @Pattern(regexp="REASSIGN|CANCEL") String action, @Positive Long staffId,
   @NotBlank @Size(min=5,max=1000) String reason) {
   public Change { reason=reason==null?null:reason.trim(); }
 }
 public record Work(Long id, Long hotelId, Long staffId, String status, String version) {}
 private String table(boolean issue) { return issue?"operations.issues":"operations.tasks"; }
 private String key(boolean issue) { return issue?"issue_id":"task_id"; }
 private Work work(boolean issue,Long id,boolean lock) {
   var rows=jdbc.query("SELECT w."+key(issue)+" AS id, rt.hotel_id,w.assigned_staff_id,w.status,CONVERT(varchar(18),CONVERT(varbinary(8),w.row_version),1) AS version FROM "+table(issue)+" w "+(lock?"WITH (UPDLOCK,HOLDLOCK) ":"")+"JOIN inventory.rooms r ON r.room_id=w.room_id JOIN inventory.room_types rt ON rt.room_type_id=r.room_type_id WHERE w."+key(issue)+"=?",
    (rs,i)->new Work(rs.getLong("id"),rs.getLong("hotel_id"),rs.getObject("assigned_staff_id",Long.class),rs.getString("status"),rs.getString("version")),id);
   if(rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND,"Không tìm thấy công việc/sự cố.");
   return rows.getFirst();
 }
 private void mutable(Work work,boolean issue) {
   if("IN_PROGRESS".equals(work.status()))
     throw new ResponseStatusException(CONFLICT,issue?"Sự cố đã được bắt đầu xử lý nên không thể giao lại. Hãy đóng và tải lại danh sách.":"Công việc đã bắt đầu nên không thể giao lại hoặc hủy. Hãy đóng và tải lại danh sách.");
   if(!(issue?List.of("ASSIGNED"):List.of("PENDING")).contains(work.status()))
     throw new ResponseStatusException(CONFLICT,"Chỉ được giao lại hoặc hủy khi công việc chưa bắt đầu. Sự cố phải ở trạng thái Đã phân công.");
 }
 public Map<String,Object> options(boolean issue,Long id) {
   var manager=managers.requireManager(); var work=work(issue,id,false); managers.assertScope(manager,work.hotelId());
   var staff=jdbc.queryForList("""
     SELECT s.staff_id AS id,u.full_name AS fullName FROM identity_access.staff s
     JOIN identity_access.users u ON u.user_id=s.user_id
     WHERE s.hotel_id=? AND s.is_active=1 AND u.is_active=1 AND EXISTS (
       SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles r ON r.role_id=ur.role_id
       WHERE ur.user_id=u.user_id AND r.code='HOUSEKEEPER' AND r.is_active=1)
     ORDER BY u.full_name,s.staff_id
     """,work.hotelId());
   return Map.of("work",work,"staff",staff,"canCancel",!issue && "PENDING".equals(work.status()) && !LinkedWorkGuard.hasIssue(jdbc,id),"canChange",(issue?List.of("ASSIGNED"):List.of("PENDING")).contains(work.status()),"history",jdbc.queryForList("""
     SELECT h.action,h.reason,h.previous_status AS previousStatus,h.new_status AS newStatus,
       oldUser.full_name AS previousStaff,newUser.full_name AS newStaff,u.full_name AS actor,
       CONVERT(varchar(30),h.created_at,126)+'Z' AS createdAt
     FROM operations.work_history h JOIN identity_access.users u ON u.user_id=h.actor_id
     LEFT JOIN identity_access.staff oldStaff ON oldStaff.staff_id=h.previous_staff_id
     LEFT JOIN identity_access.users oldUser ON oldUser.user_id=oldStaff.user_id
     LEFT JOIN identity_access.staff newStaff ON newStaff.staff_id=h.new_staff_id
     LEFT JOIN identity_access.users newUser ON newUser.user_id=newStaff.user_id
     WHERE h.work_type=? AND h.work_id=? ORDER BY h.history_id DESC
     """,issue?"ISSUE":"TASK",id));
 }
 @Transactional
 public void change(boolean issue,Long id,Change request) {
   var manager=managers.requireManager();
   var pair=issue?LinkedWorkGuard.forIssue(jdbc,id):LinkedWorkGuard.forTask(jdbc,id);
   var work=work(issue,id,true); managers.assertScope(manager,work.hotelId()); mutable(work,issue);
   if(!work.version().equalsIgnoreCase(request.version())) throw new ResponseStatusException(CONFLICT,"Dữ liệu đã thay đổi. Hãy đóng và mở lại thao tác.");
   boolean cancel="CANCEL".equals(request.action());
   if(issue && cancel) throw new ResponseStatusException(BAD_REQUEST,"Không hủy sự cố bằng thao tác này.");
   if(cancel && pair!=null) throw new ResponseStatusException(CONFLICT,"Không hủy riêng task gắn với sự cố. Hãy giao lại hoặc hoàn tất xử lý sự cố.");
   Long nextStaff=cancel?work.staffId():request.staffId();
   if(!cancel) {
     if(nextStaff==null || Objects.equals(nextStaff,work.staffId())) throw new ResponseStatusException(BAD_REQUEST,"Hãy chọn nhân viên khác.");
     Integer count=jdbc.queryForObject("""
       SELECT COUNT(*) FROM identity_access.staff s JOIN identity_access.users u ON u.user_id=s.user_id
       WHERE s.staff_id=? AND s.hotel_id=? AND s.is_active=1 AND u.is_active=1 AND EXISTS (
         SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles r ON r.role_id=ur.role_id
         WHERE ur.user_id=u.user_id AND r.code='HOUSEKEEPER' AND r.is_active=1)
       """,Integer.class,nextStaff,work.hotelId());
     if(count==null || count!=1) throw new ResponseStatusException(BAD_REQUEST,"Nhân viên không còn hoạt động hoặc không thuộc khách sạn.");
   }
   String nextStatus=cancel?"CANCELLED":work.status();
   int changed=jdbc.update("UPDATE "+table(issue)+" SET assigned_staff_id=?, "+(cancel?"":"assigned_by=?, ")+"status=?, updated_at=SYSUTCDATETIME() WHERE "+key(issue)+"=? AND row_version=CONVERT(varbinary(8),?,1)",
      cancel?new Object[]{nextStaff,nextStatus,id,request.version()}:new Object[]{nextStaff,manager.id(),nextStatus,id,request.version()});
   if(changed!=1) throw new ResponseStatusException(CONFLICT,"Dữ liệu đã thay đổi.");
   if(pair!=null) {
     var related=issue?pair.task():pair.issue(); boolean relatedIssue=!issue;
     int relatedChanged=jdbc.update("UPDATE "+table(relatedIssue)+" SET assigned_staff_id=?,assigned_by=?,updated_at=SYSUTCDATETIME() WHERE "+key(relatedIssue)+"=? AND assigned_staff_id=? AND status=?",nextStaff,manager.id(),related.id(),related.staffId(),related.status());
     if(relatedChanged!=1) throw new ResponseStatusException(CONFLICT,"Dữ liệu liên kết đã thay đổi. Vui lòng tải lại.");
     history(relatedIssue,related.id(),request,manager.id(),related.staffId(),nextStaff,related.status(),related.status());
   }
   history(issue,id,request,manager.id(),work.staffId(),nextStaff,work.status(),nextStatus);
 }
 private void history(boolean issue,Long id,Change request,Long actor,Long previousStaff,Long nextStaff,String previousStatus,String nextStatus) {
   jdbc.update("INSERT operations.work_history(work_type,work_id,action,actor_id,previous_staff_id,new_staff_id,previous_status,new_status,reason) VALUES(?,?,?,?,?,?,?,?,?)",
     issue?"ISSUE":"TASK",id,request.action(),actor,previousStaff,nextStaff,previousStatus,nextStatus,request.reason());
 }
 public List<Map<String,Object>> myReports(int page,int size) {
   var user=identity.requireUser();
   return jdbc.queryForList("""
     SELECT i.issue_id AS id,r.room_number AS roomNumber,i.title,i.status,i.description,
       i.resolution_note AS resolutionNote,CONVERT(varchar(30),i.created_at,126)+'Z' AS createdAt
     FROM operations.issues i JOIN inventory.rooms r ON r.room_id=i.room_id
     WHERE i.reported_by=? ORDER BY i.created_at DESC,i.issue_id DESC
     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
     """,user.getId(),(long)page*size,size);
 }
}
