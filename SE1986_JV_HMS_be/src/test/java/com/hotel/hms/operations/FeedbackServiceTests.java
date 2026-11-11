package com.hotel.hms.operations;
import com.hotel.hms.operations.repository.*;
import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.KeyHolder;
import com.hotel.hms.operations.security.OperationsIdentity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class FeedbackServiceTests {
 JdbcTemplate jdbc; OperationsIdentity env; IssueAssignmentService managers; FeedbackService service;
 @AfterEach void clearAuthentication(){SecurityContextHolder.clearContext();}
 @BeforeEach void setup(){jdbc=mock(JdbcTemplate.class);env=new OperationsIdentity();SecurityContextHolder.clearContext();managers=mock(IssueAssignmentService.class);service=new FeedbackService(new FeedbackRepository(jdbc),env,managers);when(managers.requireManager()).thenReturn(new IssueAssignmentRepository.Manager(2L,"Manager Demo",false));}
 void customer(){JwtTestUser.signIn("customer@sba.example");when(jdbc.query(contains("WHERE u.email"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackRepository.Customer>>any(),eq("customer@sba.example"))).thenReturn(List.of(new FeedbackRepository.Customer(5L,"Customer Demo")));}
 void booking(Long customerId,String status){when(jdbc.query(contains("SELECT booking_id,customer_id"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackRepository.BookingState>>any(),eq(2L))).thenReturn(List.of(new FeedbackRepository.BookingState(2L,customerId,1L,status)));}
 void feedback(String reply){when(jdbc.query(contains("SELECT f.feedback_id,b.hotel_id"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackRepository.FeedbackState>>any(),eq(1L))).thenReturn(List.of(new FeedbackRepository.FeedbackState(1L,1L,reply)));}
 CreateFeedbackRequest request(){return new CreateFeedbackRequest(2L,5,"  Phòng rất sạch sẽ  ");}
 @Test void disabledWithoutProfileEvenIfCustomerEmailIsAuthenticated(){
        assertEquals(401, assertThrows(ResponseStatusException.class, () -> service.getContext()).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
 @Test void inactiveOrMissingCustomerDisablesReadingAndCreating(){customer();when(jdbc.query(contains("WHERE u.email"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackRepository.Customer>>any(),eq("customer@sba.example"))).thenReturn(List.of());assertFalse(service.getContext().enabled());assertThrows(ResponseStatusException.class,()->service.myFeedback(0,5));assertThrows(ResponseStatusException.class,()->service.create(request()));}
 @Test void eligibleBookingsAreOwnCheckedOutBookingsWithoutFeedback(){customer();service.eligibleBookings();verify(jdbc).query(contains("b.status='CHECKED_OUT'"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackBookingResponse>>any(),eq(5L));verify(jdbc).query(contains("NOT EXISTS (SELECT 1 FROM operations.feedback"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackBookingResponse>>any(),eq(5L));}
 @Test void myFeedbackCannotSelectOtherCustomerIdentity(){customer();service.myFeedback(2,5);verify(jdbc).query(contains("WHERE f.customer_id=?"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackResponse>>any(),eq(5L),eq(""),eq(""),eq(10L),eq(5));}
 @Test void otherCustomerBookingIsForbidden(){customer();booking(6L,"CHECKED_OUT");assertEquals(403,assertThrows(ResponseStatusException.class,()->service.create(request())).getStatusCode().value());verify(jdbc,never()).update(any(PreparedStatementCreator.class),any(KeyHolder.class));}
 @Test void cannotReviewBeforeCheckOut(){customer();for(String status:List.of("PENDING","CONFIRMED","CHECKED_IN","CANCELLED","EXPIRED")){booking(5L,status);assertEquals(409,assertThrows(ResponseStatusException.class,()->service.create(request())).getStatusCode().value());}verify(jdbc,never()).update(any(PreparedStatementCreator.class),any(KeyHolder.class));}
 @Test void duplicateBookingConstraintReturnsConflict(){customer();booking(5L,"CHECKED_OUT");when(jdbc.update(any(PreparedStatementCreator.class),any(KeyHolder.class))).thenThrow(new DuplicateKeyException("booking unique"));assertEquals(409,assertThrows(ResponseStatusException.class,()->service.create(request())).getStatusCode().value());}
 @Test void createBindsOwnCustomerUnicodeRatingAndReturnsGeneratedId()throws Exception{customer();booking(5L,"CHECKED_OUT");var conn=mock(Connection.class);var stmt=mock(PreparedStatement.class);when(conn.prepareStatement(contains("INSERT INTO operations.feedback"),eq(Statement.RETURN_GENERATED_KEYS))).thenReturn(stmt);when(jdbc.update(any(PreparedStatementCreator.class),any(KeyHolder.class))).thenAnswer(call->{PreparedStatementCreator creator=call.getArgument(0);creator.createPreparedStatement(conn);KeyHolder key=call.getArgument(1);key.getKeyList().add(new HashMap<>(Map.of("feedback_id",9L)));return 1;});assertEquals(9L,service.create(request()));verify(stmt).setLong(1,2L);verify(stmt).setLong(2,5L);verify(stmt).setInt(3,5);verify(stmt).setNString(4,"Phòng rất sạch sẽ");}
 @Test void managerListUsesHotelScopeAndFilters(){service.managedFeedback(1,5,4,"PENDING");verify(jdbc).query(contains("ms.hotel_id=b.hotel_id"),org.mockito.ArgumentMatchers.<RowMapper<FeedbackResponse>>any(),eq(0),eq(2L),eq(4),eq(4),eq("PENDING"),eq("PENDING"),eq("PENDING"),eq(5L),eq(5));}
 @Test void replyRequiresManagerHotelMembership(){feedback(null);doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(managers).assertScope(any(),eq(1L));assertEquals(403,assertThrows(ResponseStatusException.class,()->service.reply(1L,new ReplyFeedbackRequest("Cảm ơn quý khách"))).getStatusCode().value());verify(jdbc,never()).update(any(PreparedStatementCreator.class));}
 @Test void existingReplyCannotBeOverwritten(){feedback("Already replied");assertEquals(409,assertThrows(ResponseStatusException.class,()->service.reply(1L,new ReplyFeedbackRequest("Cảm ơn quý khách"))).getStatusCode().value());verify(jdbc,never()).update(any(PreparedStatementCreator.class));}
 @Test void concurrentReplyDoesNotReportSuccess(){feedback(null);when(jdbc.update(any(PreparedStatementCreator.class))).thenReturn(0);assertEquals(409,assertThrows(ResponseStatusException.class,()->service.reply(1L,new ReplyFeedbackRequest("Cảm ơn quý khách"))).getStatusCode().value());}
 @Test void replyUsesAuthenticatedManagerUnicodeAndServerTime()throws Exception{feedback(null);var conn=mock(Connection.class);var stmt=mock(PreparedStatement.class);when(conn.prepareStatement(contains("replied_at=SYSUTCDATETIME()"))).thenReturn(stmt);when(jdbc.update(any(PreparedStatementCreator.class))).thenAnswer(call->{PreparedStatementCreator creator=call.getArgument(0);creator.createPreparedStatement(conn);return 1;});service.reply(1L,new ReplyFeedbackRequest("  Cảm ơn quý khách  "));verify(stmt).setNString(1,"Cảm ơn quý khách");verify(stmt).setLong(2,2L);verify(stmt).setLong(3,1L);verify(conn).prepareStatement(contains("AND reply IS NULL"));}
 @Test void bookingFeedbackLookupKeepsCustomerScope() {
  customer();
  service.myFeedback(0,5,"BK-OTHER");
  verify(jdbc).query(contains("WHERE f.customer_id=? AND (? = '' OR b.booking_code=?)"), org.mockito.ArgumentMatchers.<RowMapper<FeedbackResponse>>any(), eq(5L), eq("BK-OTHER"), eq("BK-OTHER"), eq(0L), eq(5));
 }
 @Test void validatesRatingCommentAndReplyAfterTrim(){try(var factory=Validation.buildDefaultValidatorFactory()){var validator=factory.getValidator();assertTrue(validator.validate(request()).isEmpty());assertFalse(validator.validate(new CreateFeedbackRequest(-1L,6,"  ")).isEmpty());assertFalse(validator.validate(new CreateFeedbackRequest(2L,0,"valid comment")).isEmpty());assertFalse(validator.validate(new CreateFeedbackRequest(2L,null,"valid comment")).isEmpty());assertFalse(validator.validate(new ReplyFeedbackRequest("   a   ")).isEmpty());assertFalse(validator.validate(new ReplyFeedbackRequest("a".repeat(2001))).isEmpty());}}
}
