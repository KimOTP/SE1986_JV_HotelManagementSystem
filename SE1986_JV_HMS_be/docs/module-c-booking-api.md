# Module C — API tạo booking

Tài liệu cho endpoint tạo đặt phòng của form `/bookings/new`.
Frontend hiện vẫn gọi mock localStorage; khi chuyển sang backend chỉ cần thay lớp gọi API,
payload và ý nghĩa các trường giữ nguyên.

## Tổng quan

| Thuộc tính | Giá trị |
| --- | --- |
| Method / path | `POST /api/bookings` |
| Xác thực | `Authorization: Bearer <access token>` |
| Quyền bắt buộc | Authority `UC-C1` |
| Content-Type | `application/json` (hoặc `application/json; charset=utf-8`) |
| Thành công | `201 Created` + `BookingResponse` |
| Lỗi | `{ "code": "...", "message": "..." }` theo convention chung |
| Transaction | Một transaction cho booking, phòng vật lý và lịch sử trạng thái |

`customerId` **không** nằm trong payload. Backend luôn lấy người dùng hiện tại từ JWT.
`hotelId`, giá phòng và tiền cọc cũng không lấy từ client: khách sạn suy ra từ loại phòng,
giá và cọc tính lại từ dữ liệu trong database.

## Request

```json
{
  "roomTypeId": 2,
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-12",
  "guests": 2,
  "rooms": 1,
  "customerName": "Nguyễn An",
  "email": "customer@sba.example",
  "phone": "0901234567",
  "specialRequests": "Tầng cao, yên tĩnh"
}
```

| Trường | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `roomTypeId` | số nguyên dương | Có | ID loại phòng đang hoạt động |
| `checkIn` | `yyyy-MM-dd` | Có | Không trước ngày hiện tại theo múi giờ khách sạn |
| `checkOut` | `yyyy-MM-dd` | Có | Phải sau `checkIn` |
| `guests` | số nguyên | Có | 1–50; không vượt sức chứa của số phòng đã chọn |
| `rooms` | số nguyên | Có | 1–10 |
| `customerName` | chuỗi | Có | Tối đa 150 ký tự; tự trim |
| `email` | chuỗi | Có | Đúng định dạng email; tối đa 254 ký tự; tự trim |
| `phone` | chuỗi | Có | Tối đa 20 ký tự; tự trim |
| `specialRequests` | chuỗi | Không | Tối đa 2000 ký tự; chuỗi rỗng thành `null`; tự trim |

Trường lạ trong JSON bị bỏ qua. `customerId`, `hotelId`, `totalAmount`, `depositRequired`
nếu client gửi lên đều không có tác dụng.

## Response thành công

```json
{
  "bookingId": 7,
  "id": "BK-33B7AD6A0B7844A8A450E587",
  "bookingCode": "BK-33B7AD6A0B7844A8A450E587",
  "customerId": 5,
  "hotelId": 1,
  "roomTypeId": 2,
  "roomTypeName": "Deluxe",
  "checkIn": "2026-12-10",
  "checkOut": "2026-12-12",
  "nights": 2,
  "guests": 4,
  "rooms": 2,
  "pricePerNight": 800000.00,
  "totalAmount": 3200000.00,
  "depositRequired": 960000.00,
  "depositPaid": 0.00,
  "status": "PENDING",
  "holdExpiresAt": "2026-11-03T15:49:32.832",
  "createdAt": "2026-11-03T15:19:32.832",
  "customerName": "Concurrency Test",
  "email": "customer@sba.example",
  "phone": "0900000001",
  "specialRequests": null,
  "assignedRooms": [
    { "roomId": 4, "roomNumber": "201" },
    { "roomId": 5, "roomNumber": "202" }
  ]
}
```

- `id` trùng `bookingCode` để frontend dùng ngay cho route `/bookings/:id`.
- `bookingId` là khóa identity trong database, hữu ích cho các API nội bộ sau này.
- `pricePerNight`, `totalAmount`, `depositRequired`, `depositPaid` là số thập phân 2 chữ số.
- `createdAt`, `holdExpiresAt` là thời gian UTC lưu trong `DATETIME2(3)`, JSON không kèm offset.
- `status` của booking mới luôn là `PENDING`.
- `depositPaid` của booking mới luôn là `0.00`; thanh toán cọc do luồng khác xử lý.
- `assignedRooms` là các phòng vật lý thực sự được giữ, không phải phòng client chọn.

## Quy tắc nghiệp vụ

### Ngày và sức chứa

- `nights = checkOut - checkIn` theo ngày lịch.
- `checkIn` được phép bằng hôm nay theo `frontdesk.hotel-zone` (mặc định `Asia/Ho_Chi_Minh`).
- `checkOut` phải lớn hơn `checkIn`; khoảng ngày là nửa mở `[checkIn, checkOut)`.
- Sức chứa: `guests <= maxGuests * rooms`.
- Số khách mỗi phòng dùng để tìm phòng: `ceil(guests / rooms)`.
  Ví dụ 4 khách / 2 phòng tìm phòng loại tối thiểu 2 khách/phòng.

### Giá và tiền cọc

Giá lấy từ `inventory.room_types.base_price` tại thời điểm tạo, không tin giá client gửi:

```text
totalAmount     = basePrice × nights × rooms        (làm tròn HALF_UP, 2 chữ số)
depositRequired = totalAmount × 0.30                (làm tròn HALF_UP, 2 chữ số)
```

Tỷ lệ cọc cố định 30% trong `BookingService`. Nếu sau này cần cấu hình, đây là điểm thay đổi.

### Giữ chỗ

- Booking mới giữ phòng trong `booking.hold-minutes` phút (mặc định 30, tối thiểu 1).
- `holdExpiresAt = createdAt + holdMinutes`.
- Procedure tìm phòng coi booking `PENDING` còn hạn giữ chỗ là đã chiếm phòng.
- Booking `PENDING` hết hạn không còn chặn phòng; job chuyển sang `EXPIRED` (nếu có) là luồng riêng.

### Mã booking

Định dạng `BK-` + 24 ký tự hex viết hoa, tổng 27 ký tự, ví dụ:

```text
BK-33B7AD6A0B7844A8A450E587
```

Cột `booking.bookings.booking_code` là `VARCHAR(30) UNIQUE`, nên mã này vừa kiểu hiển thị
vừa đảm bảo duy nhất.

### Chọn phòng vật lý

1. Khóa dòng loại phòng bằng `UPDLOCK, HOLDLOCK` trong transaction.
2. Gọi `inventory.search_available_rooms` với `hotel_id` lấy từ loại phòng.
3. Procedure loại các phòng đã có booking `CONFIRMED`, `CHECKED_IN`,
   hoặc `PENDING` còn hiệu lực giữ chỗ, trùng khoảng ngày nửa mở.
4. Lấy đúng `rooms` phòng đầu tiên theo thứ tự procedure trả về.
5. Nếu không đủ phòng, trả `409 BOOKING_ROOM_NOT_AVAILABLE` và không ghi gì.

Khóa trên dòng `room_types` giữ đến khi commit. Hai request đồng thời cùng loại phòng
được tuần tự hóa: request đầu thấy phòng trống và tạo booking, request sau thấy phòng vừa bị giữ
và nhận `409`. Đã kiểm chứng với 2 request đồng thời cho 2 phòng Deluxe: đúng một `201`,
một `409`.

## Ghi database

Trong cùng một transaction:

| Bảng | Nội dung |
| --- | --- |
| `booking.bookings` | Một dòng `PENDING`, `deposit_required`, `hold_expires_at`, thông tin liên hệ |
| `booking.booking_rooms` | Mỗi phòng vật lý một dòng, `nightly_rate = base_price` |
| `booking.booking_status_history` | `NULL → PENDING`, `changed_by = customerId`, ghi chú tạo booking |

`created_at` và `updated_at` dùng thời gian UTC. Chuỗi Unicode được ghi bằng `setNString`
(`NVARCHAR`) nên tên và yêu cầu đặc biệt tiếng Việt được giữ nguyên.

## Mã lỗi

| HTTP | `code` | Khi nào |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Payload sai kiểu, thiếu trường, email sai, vượt độ dài |
| 400 | `BAD_REQUEST` | JSON hỏng hoặc không đọc được |
| 400 | `BOOKING_CHECK_IN_PAST` | `checkIn` trước hôm nay |
| 400 | `BOOKING_INVALID_DATE_RANGE` | `checkOut` không sau `checkIn` |
| 400 | `BOOKING_GUEST_CAPACITY` | Số khách vượt sức chứa của số phòng |
| 400 | `BOOKING_INVALID_ROOM_COUNT` | Số phòng ngoài 1–10 (kiểm tra phòng thủ ở service) |
| 400 | `BOOKING_INVALID_GUEST_COUNT` | Số khách nhỏ hơn 1 (kiểm tra phòng thủ ở service) |
| 401 | — | Chưa đăng nhập hoặc token không hợp lệ (Spring Security trả body rỗng) |
| 403 | — | Đã đăng nhập nhưng thiếu `UC-C1` (Spring Security trả body rỗng) |
| 404 | `BOOKING_ROOM_TYPE_NOT_FOUND` | `roomTypeId` không tồn tại |
| 409 | `BOOKING_ROOM_TYPE_UNAVAILABLE` | Loại phòng hoặc khách sạn đã ngừng hoạt động |
| 409 | `BOOKING_ROOM_NOT_AVAILABLE` | Không đủ phòng vật lý trong khoảng ngày |
| 409 | `DATA_CONFLICT` | Vi phạm ràng buộc dữ liệu khác (unique/FK) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Không gửi `application/json` |
| 500 | `INTERNAL_ERROR` | Lỗi không mong muốn; message an toàn, không lộ SQL/stack |

## Ví dụ gọi API

```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{
    "roomTypeId": 2,
    "checkIn": "2026-11-10",
    "checkOut": "2026-11-12",
    "guests": 2,
    "rooms": 1,
    "customerName": "Nguyễn An",
    "email": "customer@sba.example",
    "phone": "0901234567",
    "specialRequests": "Tầng cao, yên tĩnh"
  }'
```

## Cấu hình

| Thuộc tính | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `booking.hold-minutes` | `30` | Số phút giữ phòng của booking `PENDING` |
| `frontdesk.hotel-zone` | `Asia/Ho_Chi_Minh` | Múi giờ dùng để xác định "hôm nay" |

Có thể đặt qua biến môi trường, ví dụ `BOOKING_HOLD_MINUTES=30`.

## Tích hợp frontend

- Base URL hiện tại: `http://localhost:8080/api`, endpoint `/bookings`.
- Dùng `axiosClient`/AuthProvider sẵn có để gắn access token; không tự thêm `/api` lần nữa.
- Payload giữ đúng tên trường như bảng Request; ngày dạng `yyyy-MM-dd`.
- Không gửi `customerId`, giá, cọc hoặc `hotelId`.
- Response trả `id`/`bookingCode` để điều hướng sang trang chi tiết booking.
- Đã có `GET /api/bookings` và `GET /api/bookings/{bookingCode}` cho màn "Đặt phòng của tôi"
  và trang chi tiết; xem mục cuối tài liệu.

## 11. API đọc và hủy booking (bổ sung cho UC-C3 / UC-C6 / UC-C4)

Ba endpoint dưới đây dùng chung một shape `BookingResponse` với `POST /api/bookings`,
nên frontend chỉ cần một hàm map. Response có thêm hai trường cuối:

| Trường | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `cancelReason` | chuỗi / null | Lý do hủy do khách nhập |
| `cancelledAt` | thời gian / null | Thời điểm hủy (UTC, không offset) |

`depositPaid` giờ được tính từ `billing.payment_transactions` (tổng giao dịch
`DEPOSIT` + `SUCCESS`), không còn luôn bằng 0 như response tạo booking.

### 11.1 Danh sách của tôi

| Thuộc tính | Giá trị |
| --- | --- |
| Method / path | `GET /api/bookings` |
| Quyền | `UC-C3` |
| Query | `page` (mặc định 0), `size` (1–100, mặc định 20), `status` (tuỳ chọn) |
| Thành công | `200` + mảng `BookingResponse`, mới nhất trước |
| Phạm vi | Chỉ booking có `customer_id` = user trong JWT |

`status` nhận `PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `EXPIRED`;
chuỗi rỗng nghĩa là không lọc. Sắp xếp `created_at DESC, booking_id DESC`, phân trang
bằng `OFFSET/FETCH`.

```bash
curl "http://localhost:8080/api/bookings?page=0&size=20&status=PENDING" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 11.2 Chi tiết một booking

| Thuộc tính | Giá trị |
| --- | --- |
| Method / path | `GET /api/bookings/{bookingCode}` |
| Quyền | `UC-C6` (chủ booking) hoặc `UC-C5` (quản lý đặt phòng xem mọi booking) |
| Thành công | `200` + `BookingResponse` |
| Không tìm thấy / của người khác | `404 BOOKING_NOT_FOUND` |

Trả 404 thay vì 403 khi booking thuộc khách khác để không xác nhận mã đặt phòng có tồn tại.

### 11.3 Hủy booking

| Thuộc tính | Giá trị |
| --- | --- |
| Method / path | `POST /api/bookings/{bookingCode}/cancel` |
| Quyền | `UC-C4`, chỉ chủ booking |
| Body | `{ "reason": "..." }` — tuỳ chọn, tối đa 1000 ký tự |
| Thành công | `200` + `BookingResponse` ở trạng thái `CANCELLED` |
| Transaction | `UPDATE` trạng thái + ghi `booking_status_history` trong một transaction |

Quy tắc:

- Chỉ hủy được `PENDING` hoặc `CONFIRMED`; trạng thái khác trả `409 BOOKING_NOT_CANCELLABLE`.
- `UPDATE` có điều kiện `status IN ('PENDING','CONFIRMED')`; nếu một luồng khác
  (thanh toán, lễ tân) vừa đổi trạng thái, số dòng cập nhật = 0 và trả
  `409 BOOKING_CANCEL_CONFLICT` — không ghi đè trạng thái mới.
- Ghi `cancel_reason`, `cancelled_at`, `updated_at` và một dòng history
  `old_status → CANCELLED`, `changed_by` = customerId, note = `Khách hủy: <lý do>`
  (hoặc `Khách hủy đặt phòng` nếu không nhập lý do).

```bash
curl -X POST "http://localhost:8080/api/bookings/BK-33B7AD6A0B7844A8A450E587/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '{"reason":"Đổi kế hoạch"}'
```

### 11.4 Mã lỗi bổ sung

| HTTP | `code` | Khi nào |
| --- | --- | --- |
| 400 | `BOOKING_INVALID_PAGE` | `page` âm hoặc quá lớn |
| 400 | `BOOKING_INVALID_PAGE_SIZE` | `size` ngoài 1–100 |
| 400 | `BOOKING_INVALID_STATUS` | `status` không thuộc danh sách cho phép |
| 400 | `BOOKING_CODE_REQUIRED` | Path thiếu mã đặt phòng |
| 400 | `BOOKING_CANCEL_REASON_TOO_LONG` | Lý do hủy quá 1000 ký tự |
| 404 | `BOOKING_NOT_FOUND` | Không có booking hoặc không thuộc khách hiện tại |
| 409 | `BOOKING_NOT_CANCELLABLE` | Booking đã check-in/check-out/hủy/hết hạn |
| 409 | `BOOKING_CANCEL_CONFLICT` | Trạng thái vừa bị luồng khác đổi trước khi UPDATE |

### 11.5 Kiểm chứng

- Unit/integration: `BookingQueryServiceTests` (12 test), `BookingApiSecurityTests` (14 test),
  `BookingServiceTests` (9 test) — toàn bộ 35 test pass.
- E2E với SQL Server (`HotelManagement_SBA_booking_test`, JWT tự sinh cho user 5):
  `GET /api/bookings` trả 6 booking, tổng tiền/`depositPaid`/loại phòng/phòng vật lý đúng;
  lọc `status=PENDING&size=2` trả 2 bản ghi; `page=1&size=4` trả trang kế tiếp;
  `size=101` → 400; `status=DONE` → 400; `GET` chi tiết → 200; mã không tồn tại → 404;
  `POST` tạo booking → 201; hủy → 200 kèm `cancelReason` tiếng Việt đúng; hủy lần hai → 409.
  Dữ liệu test đã được xoá sau khi kiểm chứng.

### 11.6 Frontend cần lưu ý

- Trạng thái hoàn tất trong DB là `CHECKED_OUT`, còn mock frontend đang dùng `COMPLETED`;
  khi nối API cần map `CHECKED_OUT → COMPLETED` (hoặc đổi nhãn hiển thị).
- `rooms` trong response là số phòng vật lý thực tế; `pricePerNight` là trung bình theo
  `nightly_rate` đã lưu, không phải giá hiện tại của loại phòng.
- Hủy booking không hoàn tiền tự động; hoàn cọc thuộc luồng billing (Module D) chưa nối.
