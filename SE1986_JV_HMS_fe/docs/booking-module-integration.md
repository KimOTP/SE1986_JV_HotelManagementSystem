# Module C — FE dùng API thật (Booking & Reservation)

Màn hình đặt phòng đã được tách lớp dữ liệu: mặc định vẫn chạy **mock localStorage**
để demo không cần backend, nhưng có thể chuyển sang **API Spring Boot** bằng biến môi
trường, không sửa code trang.

## 1. Bật API mode

`SE1986_JV_HMS_fe/.env`:

```dotenv
VITE_BOOKING_DATA_SOURCE=api
VITE_AUTH_DATA_SOURCE=api
```

- `VITE_BOOKING_DATA_SOURCE`: `mock` (mặc định) hoặc `api`.
- `VITE_AUTH_DATA_SOURCE=api` cần thiết vì backend xác thực JWT thật; tài khoản seed
  `customer@sba.example` … mật khẩu `123456` (chạy `scripts/dev-reset-passwords.sql`).
- API base mặc định `/api` (Vite proxy sang `localhost:8080`), đổi bằng `VITE_API_BASE_URL`.

Restart dev server sau khi sửa `.env`.

## 2. Kiến trúc lớp dữ liệu

| File | Vai trò |
| --- | --- |
| `api/bookingsApi.js` | Chọn repository theo `VITE_BOOKING_DATA_SOURCE` |
| `api/bookingsHttpRepository.js` | Gọi `GET /bookings`, `GET /bookings/manage`, `GET /bookings/{code}`, `POST /bookings`, `POST …/cancel`, `POST …/deposit` |
| `api/bookingsMockRepository.js` | Bọc `bookingStore` thành async, cùng contract |
| `hooks/useAsyncData.js` | `{ data, loading, error, refetch }` dùng chung |

Contract chung:

```js
listMine({ status, page, size })        // BookingResponse[]
listAll({ status, keyword, page, size })// { items, total }
getByCode(code)                         // BookingResponse
create(payload)                         // BookingResponse (201)
cancel(code, reason)                    // BookingResponse (CANCELLED)
payDeposit(code, method)                // BookingResponse (CONFIRMED)
```

## 3. Màn hình đã nối

| Màn | Hành vi |
| --- | --- |
| Đặt phòng của tôi | `listMine` (khách) hoặc `listAll` (quản lý), có loading/error + nút Thử lại; tự tải lại khi đơn hết hạn giữ chỗ |
| Chi tiết đặt phòng | `getByCode`; timeline lấy từ response, nếu API không trả thì dựng từ trạng thái + `createdAt` |
| Hủy đặt phòng | `cancel(code, reason)`, nút chuyển "Đang hủy…", lỗi hiển thị theo message backend |
| Thanh toán cọc | `listMine({status:'PENDING'})` + `payDeposit`; lỗi 409/400 hiển thị nguyên văn |
| Quản lý đặt phòng | `listAll` với `keyword`/`status`/`page`, tổng số lấy từ `X-Total-Count` |
| Tạo đặt phòng | `create` với payload đúng DTO backend; room type id lấy từ `roomsApi` (API mode) |

## 4. Khác biệt cần biết

- Backend không trả `timeline`; trang chi tiết dựng timeline tối thiểu từ trạng thái.
  Muốn timeline đầy đủ cần thêm endpoint đọc `booking_status_history`.
- `customerKey` chỉ có trong mock; API đã scope theo JWT nên trang không còn lọc client.
- Trạng thái hoàn tất: DB `CHECKED_OUT` ↔ mock `COMPLETED` (đã map nhãn ở `bookingUtils`).
- Mock vẫn mô phỏng giữ phòng 15 phút; API dùng `holdExpiresAt` thật và job `BookingHoldExpiryJob`.
- Trang tạo đơn ở API mode cần `roomsApi` chạy API (`VITE_ROOMS_DATA_SOURCE=api`) để
  `roomTypeId` là id số của database.

## 5. Kiểm chứng

- `npm run lint` sạch.
- Mock mode: 4 màn hình hiển thị/ thao tác bình thường (đã chụp ảnh ở `docs/booking-history/`,
  `docs/deposit-payment/`).
- API mode: backend đã được kiểm chứng E2E cho create/list/detail/cancel/deposit/manage
  (xem `SE1986_JV_HMS_be/docs/module-c-booking-api.md`, mục 11.6 và 11.8).
