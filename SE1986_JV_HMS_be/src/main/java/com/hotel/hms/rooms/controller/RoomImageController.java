package com.hotel.hms.rooms.controller;

import com.hotel.hms.rooms.dto.UploadedRoomImage;
import com.hotel.hms.rooms.security.InventoryScope;
import com.hotel.hms.rooms.service.RoomImageStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/inventory")
public class RoomImageController {
    private final RoomImageStorageService storage;
    private final InventoryScope scope;

    public RoomImageController(RoomImageStorageService storage, InventoryScope scope) {
        this.storage = storage;
        this.scope = scope;
    }

    /** One binary image per request; streaming bounds avoid changing shared multipart configuration. */
    @PostMapping("/admin/images")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('UC-B1')")
    public UploadedRoomImage upload(HttpServletRequest request) throws IOException {
        scope.managementHotel();
        return storage.store(request.getInputStream(), request.getContentType(),
                request.getContentLengthLong());
    }

    @GetMapping("/public/images/{name}")
    public ResponseEntity<Resource> image(@PathVariable String name) {
        var image = storage.read(name);
        return ResponseEntity.ok().contentType(image.mediaType()).contentLength(image.size())
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff").header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(name).build().toString())
                .body(image.resource());
    }
}
