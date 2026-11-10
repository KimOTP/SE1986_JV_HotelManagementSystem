package com.hotel.hms.rooms;

import com.hotel.hms.rooms.controller.InventoryController;
import com.hotel.hms.rooms.controller.InventoryExceptionHandler;
import com.hotel.hms.rooms.controller.RoomImageController;
import com.hotel.hms.rooms.service.RoomImageStorageService;
import com.hotel.hms.rooms.dto.UploadedRoomImage;
import com.hotel.hms.rooms.dto.InventoryDtos.AmenityWrite;
import com.hotel.hms.rooms.dto.InventoryDtos.AmenityView;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import com.hotel.hms.rooms.security.InventoryWebConfiguration;
import com.hotel.hms.rooms.security.InventoryScope;
import com.hotel.hms.rooms.service.InventoryService;

import com.hotel.hms.config.SecurityConfig;
import com.hotel.hms.identity.security.*;
import com.hotel.hms.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.cors.*;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@SpringJUnitWebConfig(InventorySecurityTests.Config.class)
@TestPropertySource(properties = {
        "app.jwt.secret-base64=bW9kdWxlLWUtdGVzdC1rZXktb25seS1ub3QtZm9yLXByb2R1Y3Rpb24=",
        "app.jwt.issuer=inventory-test" })
class InventorySecurityTests {
    @Configuration
    @EnableWebMvc
    @Import({ SecurityConfig.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class,
            InventoryExceptionHandler.class, InventoryWebConfiguration.class })
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
        InventoryService service() {
            return mock(InventoryService.class);
        }

        @Bean
        InventoryScope scope() {
            return mock(InventoryScope.class);
        }

        @Bean
        InventoryController controller(InventoryService service, InventoryScope scope) {
            return new InventoryController(service, scope);
        }

        @Bean
        RoomImageStorageService images() {
            return mock(RoomImageStorageService.class);
        }

        @Bean
        RoomImageController imageController(RoomImageStorageService images, InventoryScope scope) {
            return new RoomImageController(images, scope);
        }

        @Bean
        CorsConfigurationSource corsConfigurationSource() {
            return new UrlBasedCorsConfigurationSource();
        }
    }

    @Autowired
    WebApplicationContext context;
    @Autowired
    InventoryService service;
    @Autowired
    InventoryScope scope;
    @Autowired
    RoomImageStorageService images;
    MockMvc mvc;

    @BeforeEach
    void setup() {
        reset(service, scope, images);
        when(scope.publicHotel()).thenReturn(1L);
        when(scope.managementHotel()).thenReturn(1L);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void amenityCanBeCreatedWithNameDescriptionAndActiveState() throws Exception {
        var input = new AmenityWrite("Wi-Fi", "Internet", true);
        when(service.saveAmenity(null, input)).thenReturn(new AmenityView("3", "Wi-Fi", "Internet", true));
        mvc.perform(post("/api/inventory/admin/amenities")
                .with(user("admin").authorities(new SimpleGrantedAuthority("UC-B3")))
                .contentType("application/json")
                .content("{\"name\":\"Wi-Fi\",\"description\":\"Internet\",\"isActive\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("3"))
                .andExpect(jsonPath("$.name").value("Wi-Fi"))
                .andExpect(jsonPath("$.description").value("Internet"))
                .andExpect(jsonPath("$.isActive").value(true))
                .andExpect(jsonPath("$.*", org.hamcrest.Matchers.hasSize(4)));
        verify(service).saveAmenity(null, input);
    }

    @Test
    void onlyUcB1CanUploadWhileStoredImagesArePublic() throws Exception {
        String upload = "/api/inventory/admin/images";
        mvc.perform(post(upload).contentType("image/png").content(new byte[] { 1 }))
                .andExpect(status().isUnauthorized());
        for (String role : List.of("MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "CUSTOMER")) {
            mvc.perform(post(upload).with(user(role).roles(role)).contentType("image/png")
                    .content(new byte[] { 1 })).andExpect(status().isForbidden());
        }
        verifyNoInteractions(images);
        when(images.store(any(), eq("image/png"), anyLong())).thenReturn(
                new UploadedRoomImage("http://localhost:8080/api/inventory/public/images/test.png"));
        mvc.perform(post(upload).with(user("admin").authorities(new SimpleGrantedAuthority("UC-B1")))
                .contentType("image/png").content(new byte[] { 1 })).andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").isNotEmpty());
        String name = "00000000-0000-0000-0000-000000000000.png";
        when(images.read(name)).thenReturn(new RoomImageStorageService.StoredImage(
                new ByteArrayResource(new byte[] { 1, 2, 3 }), MediaType.IMAGE_PNG, 3));
        mvc.perform(get("/api/inventory/public/images/" + name)).andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(new byte[] { 1, 2, 3 }));
    }

    @Test
    void guestsCanSearchAndReadPublicCatalogButCannotReadInternalData() throws Exception {
        mvc.perform(get("/api/inventory/public/catalog")).andExpect(status().isOk());
        mvc.perform(get("/api/inventory/public/search").param("checkIn", "2020-01-01")
                .param("checkOut", "2020-01-02").param("guests", "1")).andExpect(status().isOk());
        for (String path : List.of("admin/room-types", "admin/rooms", "admin/amenities", "room-map"))
            mvc.perform(get("/api/inventory/" + path)).andExpect(status().isUnauthorized());
    }

    @Test
    void seedRoleMatrixProtectsEachReadEndpoint() throws Exception {
        for (String role : List.of("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "CUSTOMER")) {
            var authorities = new ArrayList<SimpleGrantedAuthority>();
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            if (role.equals("ADMIN"))
                for (String uc : List.of("UC-B1", "UC-B2", "UC-B3"))
                    authorities.add(new SimpleGrantedAuthority(uc));
            boolean canViewMap = Set.of("MANAGER", "RECEPTIONIST", "HOUSEKEEPER").contains(role);
            if (canViewMap)
                authorities.add(new SimpleGrantedAuthority("UC-B6"));
            var principal = user(role).authorities(authorities.toArray(SimpleGrantedAuthority[]::new));
            for (String resource : List.of("room-types", "rooms", "amenities"))
                mvc.perform(get("/api/inventory/admin/" + resource).with(principal))
                        .andExpect(status().is(role.equals("ADMIN") ? 200 : 403));
            mvc.perform(get("/api/inventory/room-map").with(principal))
                    .andExpect(status().is(canViewMap ? 200 : 403));
        }
    }

    @Test
    void roleWithoutUcPermissionCannotWriteAndBodyCannotBypassSecurity() throws Exception {
        for (String resource : List.of("room-types", "rooms", "amenities")) {
            mvc.perform(delete("/api/inventory/admin/" + resource + "/1").with(user("admin").roles("ADMIN")))
                    .andExpect(status().isForbidden());
            mvc.perform(
                    post("/api/inventory/admin/" + resource).contentType("application/json").content("{}"))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(service);
    }

    @Test
    void invalidSearchAndCatalogBodiesReturn400() throws Exception {
        mvc.perform(get("/api/inventory/public/search")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/inventory/public/search").param("checkIn", "bad")
                .param("checkOut", "2026-01-02").param("guests", "1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/inventory/public/search").param("checkIn", "2026-01-01")
                .param("checkOut", "2026-01-02").param("guests", "0")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/inventory/admin/room-types")
                .with(user("admin").authorities(new SimpleGrantedAuthority("UC-B1")))
                .contentType("application/json").content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void decimalFloorAndDecimalIdsAreNotSilentlyTruncated() throws Exception {
        var admin = user("admin").authorities(new SimpleGrantedAuthority("UC-B2"));
        for (String body : List.of(
                "{\"roomNumber\":\"101\",\"floor\":1.5,\"roomTypeId\":\"2\",\"notes\":\"\",\"isActive\":true}",
                "{\"roomNumber\":\"101\",\"floor\":1,\"roomTypeId\":2.5,\"notes\":\"\",\"isActive\":true}"))
            mvc.perform(post("/api/inventory/admin/rooms").with(admin).contentType("application/json")
                    .content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void eachWriteVerbRequiresItsResourcePermissionForAllSeedRoles() throws Exception {
        String body = "{\"isActive\":false}";
        for (String role : List.of("MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "CUSTOMER")) {
            var principal = user(role).roles(role);
            for (String resource : List.of("room-types", "rooms", "amenities")) {
                mvc.perform(delete("/api/inventory/admin/" + resource + "/1").with(principal))
                        .andExpect(status().isForbidden());
                mvc.perform(patch("/api/inventory/admin/" + resource + "/1/active").with(principal)
                        .contentType("application/json").content(body)).andExpect(status().isForbidden());
            }
        }
        verifyNoInteractions(service);
    }
}
