package com.hotel.hms.bookings;

import com.hotel.hms.bookings.controller.BookingController;
import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.dto.CreateBookingRequest;
import com.hotel.hms.bookings.service.BookingQueryService;
import com.hotel.hms.bookings.service.BookingService;
import com.hotel.hms.common.exception.GlobalExceptionHandler;
import com.hotel.hms.config.SecurityConfig;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.security.AuthUserDetailsService;
import com.hotel.hms.identity.security.JwtAuthenticationFilter;
import com.hotel.hms.identity.security.JwtProperties;
import com.hotel.hms.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitWebConfig(BookingApiSecurityTests.Config.class)
@TestPropertySource(properties = {
        "app.jwt.secret-base64=bW9kdWxlLWMtYm9va2luZy10ZXN0LWtleS1ub3QtcHJvZHVjdGlvbg==",
        "app.jwt.issuer=booking-test"
})
class BookingApiSecurityTests {

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean
        AuthUserDetailsService users() {
            return mock(AuthUserDetailsService.class);
        }

        @Bean
        JwtService jwt(JwtProperties properties) {
            return new JwtService(properties);
        }

        @Bean
        BookingService service() {
            return mock(BookingService.class);
        }

        @Bean
        BookingQueryService queryService() {
            return mock(BookingQueryService.class);
        }

        @Bean
        BookingController controller(BookingService service, BookingQueryService queryService) {
            return new BookingController(service, queryService);
        }

        @Bean
        CorsConfigurationSource corsConfigurationSource() {
            return new UrlBasedCorsConfigurationSource();
        }
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private BookingService service;

    @Autowired
    private BookingQueryService queryService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        reset(service, queryService);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousRequestIsRejected() throws Exception {
        mvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validBody()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void authenticatedUserWithoutUcC1IsForbidden() throws Exception {
        mvc.perform(post("/api/bookings")
                        .with(auth(5L, "ROLE_CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validBody()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void customerWithUcC1CreatesBookingForPrincipalIdentity() throws Exception {
        when(service.create(eq(5L), any())).thenReturn(response());

        mvc.perform(post("/api/bookings")
                        .with(auth(5L, "ROLE_CUSTOMER", "UC-C1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validBody().replace("\"specialRequests\": \"Tầng cao\"",
                                "\"specialRequests\": \"Tầng cao\", \"customerId\": 999")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingId").value(99))
                .andExpect(jsonPath("$.id").value("BK-TEST"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalAmount").value(1600000.00))
                .andExpect(jsonPath("$.depositRequired").value(480000.00))
                .andExpect(jsonPath("$.assignedRooms[0].roomNumber").value("201"));

        ArgumentCaptor<CreateBookingRequest> request = ArgumentCaptor.forClass(CreateBookingRequest.class);
        verify(service).create(eq(5L), request.capture());
        assertEquals("Nguyễn An", request.getValue().customerName());
        assertEquals(2, request.getValue().guests());
    }

    @Test
    void invalidBodyReturnsBadRequestBeforeServiceRuns() throws Exception {
        String body = """
                {
                  "roomTypeId": 2,
                  "checkIn": "2035-01-10",
                  "checkOut": "2035-01-12",
                  "guests": 0,
                  "rooms": 1,
                  "customerName": " ",
                  "email": "not-an-email",
                  "phone": "",
                  "specialRequests": ""
                }
                """;

        mvc.perform(post("/api/bookings")
                        .with(auth(5L, "UC-C1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void malformedJsonReturnsBadRequest() throws Exception {
        mvc.perform(post("/api/bookings")
                        .with(auth(5L, "UC-C1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void unsupportedContentTypeReturnsUnsupportedMediaType() throws Exception {
        mvc.perform(post("/api/bookings")
                        .with(auth(5L, "UC-C1"))
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(validBody()))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        verifyNoInteractions(service);
    }

    @Test
    void anonymousCannotListMyBookings() throws Exception {
        mvc.perform(get("/api/bookings"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(queryService);
    }

    @Test
    void customerWithoutUcC3CannotListMyBookings() throws Exception {
        mvc.perform(get("/api/bookings").with(auth(5L, "ROLE_CUSTOMER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(queryService);
    }

    @Test
    void customerWithUcC3ListsOnlyOwnBookings() throws Exception {
        when(queryService.listMine(eq(5L), eq(""), eq(0), eq(20)))
                .thenReturn(List.of(response()));

        mvc.perform(get("/api/bookings").with(auth(5L, "UC-C3")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("BK-TEST"))
                .andExpect(jsonPath("$[0].roomTypeName").value("Deluxe"))
                .andExpect(jsonPath("$[0].assignedRooms[0].roomNumber").value("201"));

        verify(queryService).listMine(5L, "", 0, 20);
    }

    @Test
    void detailRequiresUcC6AndPassesOwnershipFlag() throws Exception {
        when(queryService.getByCode(5L, "BK-TEST", false)).thenReturn(response());

        mvc.perform(get("/api/bookings/BK-TEST").with(auth(5L, "UC-C6")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingCode").value("BK-TEST"));

        verify(queryService).getByCode(5L, "BK-TEST", false);
    }

    @Test
    void managerWithUcC5MayOpenAnyBooking() throws Exception {
        when(queryService.getByCode(9L, "BK-OTHER", true)).thenReturn(response());

        mvc.perform(get("/api/bookings/BK-OTHER").with(auth(9L, "UC-C5")))
                .andExpect(status().isOk());

        verify(queryService).getByCode(9L, "BK-OTHER", true);
    }

    @Test
    void cancelWithoutUcC4IsForbidden() throws Exception {
        mvc.perform(post("/api/bookings/BK-TEST/cancel")
                        .with(auth(5L, "UC-C3"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Đổi kế hoạch\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(queryService);
    }

    @Test
    void customerCancelsOwnBooking() throws Exception {
        when(queryService.cancel(5L, "BK-TEST", "Đổi kế hoạch")).thenReturn(cancelledResponse());

        mvc.perform(post("/api/bookings/BK-TEST/cancel")
                        .with(auth(5L, "UC-C4"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Đổi kế hoạch\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Đổi kế hoạch"));

        verify(queryService).cancel(5L, "BK-TEST", "Đổi kế hoạch");
    }

    @Test
    void cancelWithoutBodyIsAccepted() throws Exception {
        when(queryService.cancel(5L, "BK-TEST", null)).thenReturn(cancelledResponse());

        mvc.perform(post("/api/bookings/BK-TEST/cancel").with(auth(5L, "UC-C4")))
                .andExpect(status().isOk());

        verify(queryService).cancel(5L, "BK-TEST", null);
    }

    private static String validBody() {        return """
                {
                  "roomTypeId": 2,
                  "checkIn": "2035-01-10",
                  "checkOut": "2035-01-12",
                  "guests": 2,
                  "rooms": 1,
                  "customerName": "Nguyễn An",
                  "email": "customer@hotel.demo",
                  "phone": "0900000001",
                  "specialRequests": "Tầng cao"
                }
                """;
    }

    private static BookingResponse response() {
        return new BookingResponse(
                99L, "BK-TEST", "BK-TEST", 5L, 1L, 2L, "Deluxe",
                LocalDate.of(2035, 1, 10), LocalDate.of(2035, 1, 12), 2, 2, 1,
                new BigDecimal("800000.00"), new BigDecimal("1600000.00"),
                new BigDecimal("480000.00"), new BigDecimal("0.00"), "PENDING",
                LocalDateTime.of(2035, 1, 1, 10, 0),
                LocalDateTime.of(2035, 1, 1, 9, 30),
                "Nguyễn An", "customer@hotel.demo", "0900000001", "Tầng cao",
                List.of(new BookingResponse.AssignedRoom(4L, "201")),
                null, null
        );
    }

    private static BookingResponse cancelledResponse() {
        BookingResponse created = response();
        return new BookingResponse(
                created.bookingId(), created.id(), created.bookingCode(), created.customerId(),
                created.hotelId(), created.roomTypeId(), created.roomTypeName(),
                created.checkIn(), created.checkOut(), created.nights(), created.guests(),
                created.rooms(), created.pricePerNight(), created.totalAmount(),
                created.depositRequired(), created.depositPaid(), "CANCELLED",
                created.holdExpiresAt(), created.createdAt(), created.customerName(),
                created.email(), created.phone(), created.specialRequests(),
                created.assignedRooms(), "Đổi kế hoạch", LocalDateTime.of(2035, 1, 2, 8, 0));
    }

    private static RequestPostProcessor auth(long userId, String... authorities) {        AuthUserDetails principal = mock(AuthUserDetails.class);
        when(principal.getId()).thenReturn(userId);
        when(principal.getUsername()).thenReturn("customer@sba.example");
        var token = new UsernamePasswordAuthenticationToken(principal, null,
                Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList());
        return authentication(token);
    }
}
