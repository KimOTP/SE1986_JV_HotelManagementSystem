package com.hotel.hms.rooms.service;

import com.hotel.hms.rooms.dto.UploadedRoomImage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URI;
import java.nio.file.*;
import java.util.Locale;
import java.util.UUID;
import static org.springframework.http.HttpStatus.*;

/** Persistent local storage for Module B only. Uploads are validated and re-encoded as raster images. */
@Service
public class RoomImageStorageService {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final long MAX_PIXELS = 20_000_000L;
    private final Path directory;
    private final String publicBaseUrl;
    private final boolean enabled;

    public RoomImageStorageService(
            @Value("${inventory.image-directory:${INVENTORY_IMAGE_DIRECTORY:${user.home}/.hotel-management/room-images}}") String directory,
            @Value("${inventory.image-base-url:${INVENTORY_IMAGE_BASE_URL:http://localhost:8080/api/inventory/public/images}}") String publicBaseUrl,
            @Value("${inventory.extensions-enabled:${INVENTORY_EXTENSIONS_ENABLED:false}}") boolean enabled) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        URI base = URI.create(publicBaseUrl);
        if (!("http".equalsIgnoreCase(base.getScheme()) || "https".equalsIgnoreCase(base.getScheme()))
                || base.getHost() == null || base.getUserInfo() != null || base.getQuery() != null
                || base.getFragment() != null) {
            throw new IllegalArgumentException(
                    "INVENTORY_IMAGE_BASE_URL must be a public HTTP(S) image endpoint");
        }
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.enabled = enabled;
    }

    public UploadedRoomImage store(InputStream input, String contentType, long contentLength) {
        if (!enabled)
            throw new ResponseStatusException(CONFLICT, "Chưa bật chức năng ảnh loại phòng.");
        String mediaType = contentType == null ? ""
                : contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if (!mediaType.equals("image/jpeg") && !mediaType.equals("image/png"))
            throw new ResponseStatusException(UNSUPPORTED_MEDIA_TYPE, "Chỉ hỗ trợ ảnh JPG hoặc PNG.");
        if (contentLength > MAX_BYTES)
            throw tooLarge();

        Path target = null;
        boolean created = false;
        try {
            byte[] bytes = input.readNBytes(MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES)
                throw tooLarge();
            if (bytes.length == 0)
                throw invalidImage();
            String format = mediaType.equals("image/png") ? "png" : "jpeg";
            byte[] encoded = validateAndEncode(bytes, format);
            if (encoded.length > MAX_BYTES)
                throw tooLarge();
            Files.createDirectories(directory);
            String name = UUID.randomUUID() + (format.equals("png") ? ".png" : ".jpg");
            target = directory.resolve(name);
            try (var output = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW,
                    StandardOpenOption.WRITE)) {
                created = true;
                output.write(encoded);
            }
            return new UploadedRoomImage(publicBaseUrl + "/" + name);
        } catch (IOException e) {
            // Only clean up the new file from this failed upload; never touch another image.
            if (created) {
                try {
                    Files.deleteIfExists(target);
                } catch (IOException ignored) {
                    /* preserve original failure */ }
            }
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR,
                    "Không thể lưu ảnh. Vui lòng thử lại sau.");
        }
    }

    private byte[] validateAndEncode(byte[] bytes, String expectedFormat) {
        try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext())
                throw invalidImage();
            var reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                if (!reader.getFormatName().equalsIgnoreCase(expectedFormat))
                    throw invalidImage();
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 8192 || height > 8192
                        || (long) width * height > MAX_PIXELS)
                    throw new ResponseStatusException(BAD_REQUEST,
                            "Kích thước ảnh quá lớn; tối đa 20 megapixel và mỗi chiều 8192 px.");
                BufferedImage image = reader.read(0);
                if (image == null)
                    throw invalidImage();
                try {
                    // Convert JPEG to a standard RGB color space before re-encoding.
                    if (expectedFormat.equals("jpeg")) {
                        var rgb = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                        var graphics = rgb.createGraphics();
                        try {
                            graphics.setColor(Color.WHITE);
                            graphics.fillRect(0, 0, width, height);
                            graphics.drawImage(image, 0, 0, null);
                        } finally {
                            graphics.dispose();
                        }
                        image.flush();
                        image = rgb;
                    }
                    var output = new ByteArrayOutputStream();
                    if (!ImageIO.write(image, expectedFormat, output))
                        throw invalidImage();
                    return output.toByteArray();
                } finally {
                    image.flush();
                }
            } finally {
                reader.dispose();
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw invalidImage();
        }
    }

    public StoredImage read(String name) {
        if (name == null
                || !name.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png)"))
            throw new ResponseStatusException(NOT_FOUND, "Không tìm thấy ảnh.");
        Path path = directory.resolve(name).normalize();
        if (!path.startsWith(directory) || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
            throw new ResponseStatusException(NOT_FOUND, "Không tìm thấy ảnh.");
        try {
            return new StoredImage(new FileSystemResource(path),
                    name.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG, Files.size(path));
        } catch (IOException e) {
            throw new ResponseStatusException(NOT_FOUND, "Không tìm thấy ảnh.");
        }
    }

    public record StoredImage(Resource resource, MediaType mediaType, long size) {
    }

    private ResponseStatusException tooLarge() {
        return new ResponseStatusException(PAYLOAD_TOO_LARGE, "Mỗi ảnh tối đa 5 MB.");
    }

    private ResponseStatusException invalidImage() {
        return new ResponseStatusException(BAD_REQUEST,
                "File không phải ảnh JPG/PNG hợp lệ hoặc ảnh đã bị hỏng.");
    }
}
