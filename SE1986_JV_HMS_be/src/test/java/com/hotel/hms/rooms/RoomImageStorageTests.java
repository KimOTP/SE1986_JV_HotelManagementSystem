package com.hotel.hms.rooms;

import com.hotel.hms.rooms.service.RoomImageStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.zip.CRC32;
import static org.junit.jupiter.api.Assertions.*;

class RoomImageStorageTests {
    @TempDir
    Path directory;
    String base = "http://localhost:8080/api/inventory/public/images";

    RoomImageStorageService storage() {
        return new RoomImageStorageService(directory.toString(), base, true);
    }

    byte[] image(String format) throws IOException {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), format, output);
        return output.toByteArray();
    }

    @Test
    void pngUploadReturnsPersistentUrlAndImageSurvivesNewServiceInstance() throws Exception {
        byte[] input = image("png");
        var uploaded = storage().store(new ByteArrayInputStream(input), "image/png", input.length);
        assertTrue(uploaded.url().startsWith(base + "/"));
        String name = uploaded.url().substring(uploaded.url().lastIndexOf('/') + 1);
        assertTrue(name.matches("[0-9a-f-]{36}\\.png"));
        var stored = storage().read(name);
        assertEquals(MediaType.IMAGE_PNG, stored.mediaType());
        assertEquals(stored.size(), stored.resource().contentLength());
        try (var stream = stored.resource().getInputStream()) {
            assertEquals(2, ImageIO.read(stream).getWidth());
        }
    }

    @Test
    void jpegIsReencodedAndAppendedNonImageDataIsRemoved() throws Exception {
        var input = new ByteArrayOutputStream();
        input.write(image("jpeg"));
        input.write("<script>untrusted</script>".getBytes(StandardCharsets.UTF_8));
        var uploaded = storage().store(new ByteArrayInputStream(input.toByteArray()), "image/jpeg",
                input.size());
        String name = uploaded.url().substring(uploaded.url().lastIndexOf('/') + 1);
        var saved = Files.readAllBytes(directory.resolve(name));
        assertEquals(MediaType.IMAGE_JPEG, storage().read(name).mediaType());
        assertFalse(new String(saved, StandardCharsets.ISO_8859_1).contains("untrusted"));
    }

    @Test
    void rejectsEmptyCorruptAndMismatchedImageContent() throws Exception {
        assertStatus(400, () -> storage().store(InputStream.nullInputStream(), "image/png", 0));
        assertStatus(400,
                () -> storage().store(new ByteArrayInputStream("not a photo".getBytes()), "image/png", -1));
        byte[] jpeg = image("jpeg");
        assertStatus(400, () -> storage().store(new ByteArrayInputStream(jpeg), "image/png", jpeg.length));
        try (var files = Files.list(directory)) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void rejectsSvgAndOtherContentTypes() {
        assertStatus(415, () -> storage().store(InputStream.nullInputStream(), "image/svg+xml", 0));
        assertStatus(415, () -> storage().store(InputStream.nullInputStream(), "text/html", 0));
        assertStatus(415, () -> storage().store(InputStream.nullInputStream(), null, 0));
    }

    @Test
    void sizeLimitChecksDeclaredLengthBeforeReadingAndBoundsUnknownLengthStreams() {
        InputStream mustNotRead = new InputStream() {
            @Override
            public int read() {
                throw new AssertionError("Oversize declared body must not be read");
            }
        };
        assertStatus(413,
                () -> storage().store(mustNotRead, "image/png", RoomImageStorageService.MAX_BYTES + 1L));
        byte[] oversized = new byte[RoomImageStorageService.MAX_BYTES + 1];
        assertStatus(413, () -> storage().store(new ByteArrayInputStream(oversized), "image/png", -1));
    }

    @Test
    void rejectsExcessiveDimensionsBeforeDecodingPixels() throws Exception {
        byte[] png = image("png");
        // Change the IHDR dimensions and checksum without allocating a huge bitmap.
        var buffer = java.nio.ByteBuffer.wrap(png);
        buffer.putInt(16, 5000);
        buffer.putInt(20, 5000);
        var checksum = new CRC32();
        checksum.update(png, 12, 17);
        buffer.putInt(29, (int) checksum.getValue());
        assertStatus(400, () -> storage().store(new ByteArrayInputStream(png), "image/png", png.length));
    }

    @Test
    void cannotReadArbitraryFilesOrTraverseDirectories() {
        for (String name : new String[] { "../.env", "..\\.env", "photo.svg", "photo.png",
                "00000000-0000-0000-0000-000000000000.png" }) {
            assertStatus(404, () -> storage().read(name));
        }
    }

    @Test
    void disabledImagesRefuseUploadAndDiskFailureDoesNotExposeInternalPath() throws Exception {
        var disabled = new RoomImageStorageService(directory.toString(), base, false);
        assertStatus(409, () -> disabled.store(InputStream.nullInputStream(), "image/png", 0));
        Path occupied = directory.resolve("occupied");
        Files.writeString(occupied, "keep this file");
        var broken = new RoomImageStorageService(occupied.toString(), base, true);
        byte[] png = image("png");
        var error = assertThrows(ResponseStatusException.class,
                () -> broken.store(new ByteArrayInputStream(png), "image/png", png.length));
        assertEquals(500, error.getStatusCode().value());
        assertFalse(error.getReason().contains(directory.toString()));
        assertEquals("keep this file", Files.readString(occupied));
    }

    private void assertStatus(int status, org.junit.jupiter.api.function.Executable action) {
        assertEquals(status, assertThrows(ResponseStatusException.class, action).getStatusCode().value());
    }
}
