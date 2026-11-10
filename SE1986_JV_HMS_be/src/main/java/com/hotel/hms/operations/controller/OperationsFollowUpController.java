package com.hotel.hms.operations.controller;
import com.hotel.hms.operations.service.OperationsFollowUpService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.springframework.http.HttpStatus.*;
@RestController
@RequestMapping("/api/operations")
public class OperationsFollowUpController {
 private final OperationsFollowUpService service;
 public OperationsFollowUpController(OperationsFollowUpService service) { this.service=service; }
 @GetMapping("/tasks/{id}/management") @PreAuthorize("hasAuthority('UC-E1')")
 public Map<String,Object> task(@PathVariable Long id) { return service.options(false,id); }
 @PatchMapping("/tasks/{id}/management") @PreAuthorize("hasAuthority('UC-E1')") @ResponseStatus(NO_CONTENT)
 public void taskChange(@PathVariable Long id,@Valid @RequestBody OperationsFollowUpService.Change request) { service.change(false,id,request); }
 @GetMapping("/issues/{id}/management") @PreAuthorize("hasAuthority('UC-E5')")
 public Map<String,Object> issue(@PathVariable Long id) { return service.options(true,id); }
 @PatchMapping("/issues/{id}/management") @PreAuthorize("hasAuthority('UC-E5')") @ResponseStatus(NO_CONTENT)
 public void issueChange(@PathVariable Long id,@Valid @RequestBody OperationsFollowUpService.Change request) { service.change(true,id,request); }
 @GetMapping("/my-issue-reports") @PreAuthorize("hasAuthority('UC-E4')")
 public List<Map<String,Object>> mine(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="5") int size) {
   if(page<0 || size<1 || size>100) throw new ResponseStatusException(BAD_REQUEST,"Phân trang không hợp lệ.");
   return service.myReports(page,size);
 }
}
