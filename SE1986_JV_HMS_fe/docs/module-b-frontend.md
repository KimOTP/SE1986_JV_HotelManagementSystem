# Module B – Room Catalog & Availability

## Chạy ứng dụng

```bash
npm install
npm run dev
npm run build
npm run lint
```

Sao chép `.env.example` thành `.env` nếu cần đổi nguồn dữ liệu. Mặc định không cần backend:

- `VITE_ROOMS_DATA_SOURCE=mock`: repository mock có độ trễ và lưu ở `localStorage`.
- `VITE_ROOMS_DATA_SOURCE=api`: chỉ dùng HTTP repository, lỗi API được hiển thị và không tự fallback.
- `VITE_API_BASE_URL`: base URL cho Axios. Không đặt secret trong biến `VITE_*`.

## Route và quyền

| Route                    | Chức năng              | Quyền demo          |
| ------------------------ | ---------------------- | ------------------- |
| `/rooms`                 | Tìm phòng theo ngày    | Guest/Admin/Manager |
| `/rooms/:roomTypeId`     | Chi tiết loại phòng    | Guest/Admin/Manager |
| `/rooms/booking-handoff` | Điểm bàn giao Module C | Guest/Admin/Manager |
| `/admin/room-types`      | CRUD loại phòng        | Admin               |
| `/admin/rooms`           | CRUD phòng vật lý      | Admin               |
| `/admin/amenities`       | CRUD tiện nghi         | Admin               |
| `/admin/room-map`        | Sơ đồ phòng            | Admin/Manager       |

Auth của workspace chưa được triển khai. Trong mock/development, chọn Guest/Admin/Manager trên header nội bộ để demo. Đây chỉ là adapter UI, không phải bảo mật thật. Ở API mode adapter không tự cấp Admin và không tạo/gửi token giả. Khi Module A có provider thật, thay `AuthProvider` và giữ interface `canManage`, `canViewMap` hoặc cập nhật `RoomRouteGuard`.

## Mock và reset

Store dùng key `se1986.moduleB.rooms.v1`; seed chỉ diễn ra khi key chưa tồn tại, sai version hoặc JSON hỏng. CRUD của loại phòng/phòng/tiện nghi, search, detail và Room Map cùng đọc store này. Refresh giữ dữ liệu. Reset demo trong DevTools:

```js
localStorage.removeItem('se1986.moduleB.rooms.v1');
location.reload();
```

Key role demo là `se1986.moduleB.demoRole`. Module B không đọc/ghi dữ liệu Module E.

## Mô hình FE đề xuất (chưa phải DTO/database đã xác nhận)

- `RoomType`: `id, name, description, basePrice, capacity, area, bedType, images, amenityIds, isActive`.
- `Room`: `id, roomNumber, floor, roomTypeId, notes, isActive, operationalStatus`.
- `Amenity`: `id, name, iconKey, description, isActive`.
- `ReservationFixture`: `id, roomId, checkIn, checkOut, status`.

Tiện nghi và giá nằm ở loại phòng; khách chọn loại phòng; detail dùng `roomTypeId`; map dùng phòng vật lý; tiền VND. `operationalStatus`: `READY`, `OCCUPIED`, `DIRTY`, `MAINTENANCE`; active độc lập. Tầng là số nguyên, cho phép 0 và số âm. Loại phòng/tiện nghi inactive đang được tham chiếu vẫn hiện khi sửa dữ liệu cũ nhưng không được gán mới.

## Availability demo

Khoảng lưu trú là `[checkIn, checkOut)`. Hai khoảng giao nhau khi `existingCheckIn < requestedCheckOut && existingCheckOut > requestedCheckIn`; vì vậy checkout cùng ngày với check-in mới không xung đột. Chỉ `CONFIRMED` và `CHECKED_IN` chặn phòng; `CANCELLED` không chặn. Phòng inactive bị loại. Vì mock chưa có lịch bảo trì theo ngày, phòng `MAINTENANCE` bị loại khỏi nguồn bán. `OCCUPIED` hiện tại không chặn mọi ngày tương lai; reservation theo ngày quyết định. Search chỉ trả loại phòng active, đủ sức chứa và còn ít nhất một phòng.

## Facade và HTTP contract đề xuất

Component chỉ gọi `roomsApi`: `getAll`, `list`, `getRoomType`, `save`, `remove`, `search`, `availability`. Chọn repository tại build time bằng env.

Endpoint đề xuất, cần backend xác nhận/mapping lại:

- `GET /rooms/roomTypes`, `GET /rooms/rooms`, `GET /rooms/amenities`
- `GET /room-types/{id}`
- `POST|PUT|DELETE /rooms/{resource}[/{id}]`
- `GET /rooms/search?checkIn=2026-10-20&checkOut=2026-10-22&guests=2`
- `GET /room-types/{id}/availability?checkIn=...&checkOut=...&guests=...`

Adapter đọc được body là array, `{items: []}`, `{data: []}` hoặc `{data: object}`. Đây là khả năng tương thích tạm thời, không phải contract đã xác nhận. Search API mode phải trả availability đã tính từ backend; frontend chỉ áp bộ lọc hiển thị giá/loại/tiện nghi, không dùng fixture để tính lại.

Ví dụ search response:

```json
[
  {
    "id": "rt-deluxe",
    "name": "Deluxe",
    "basePrice": 950000,
    "capacity": 2,
    "amenityIds": ["am-wifi"],
    "availableRooms": 2
  }
]
```

Detail response là một `RoomType`; availability response là cùng dữ liệu loại phòng có `availableRooms`, hoặc `null` khi hết phòng.

## Handoff Module C

Hiện chưa có route tạo Booking thật. Nút Đặt phòng kiểm tra availability lần cuối rồi chuyển đến `/rooms/booking-handoff` bằng query string gồm `roomTypeId, checkIn, checkOut, guests, roomCount=1`; dữ liệu sống qua refresh/direct link. Trang handoff không tạo booking, thu tiền hay báo đặt thành công. Khi Module C có route thật, chỉ cần đổi đích trong `RoomDetailPage` (nên tập trung thành config/service khi contract chốt), không chiếm `/bookings/create` lúc này.

## Ảnh, giá và giới hạn demo

Ảnh demo nhận URL theo từng dòng, tối đa 6, hoặc dùng fallback ổn định; không có upload server/blob URL. `data:` URL có thể làm đầy localStorage nên không được khuyến nghị. Tổng dự kiến chỉ là `số đêm × basePrice`, chưa có thuế/giảm giá/phụ phí. Không có realtime; Room Map có nút Làm mới và không suy diễn từ mockTasks Module E. Không triển khai check-in/out hoặc giao việc dọn phòng.

## Điểm cần thống nhất

- Module A: shape user/role và guard thực tế.
- Module C: route nhận handoff, reservation status chặn phòng, room count và quy tắc giữ phòng.
- Module D: nguồn thay đổi `operationalStatus`.
- Module E: chỉ hiển thị độc lập; Module B không suy diễn trạng thái từ housekeeping task.
- Backend: endpoint, envelope/pagination/error schema, upload ảnh, timezone, availability authoritative và quy tắc deactivate/delete.

## Kết quả kiểm tra ngày 17/10/2026

- `npm install`: đạt.
- `npm run build`: đạt; Vite cảnh báo bundle chính lớn hơn 500 kB (không chặn build).
- `npm run lint`: đạt, không có lỗi/cảnh báo.
- Kiểm tra logic bằng Node: 4/4 đạt (overlap, checkout trùng check-in, booking hủy không chặn, validation ngày/số khách).
- Chưa có browser automation trong workspace nên chưa xác minh trực quan bằng trình duyệt; đã kiểm tra bằng build/lint. Module E không bị refactor, các route cũ được giữ nguyên.

Checklist thủ công đề nghị: CRUD và duplicate; rule xóa/deactivate; refresh store; search → detail → handoff; checkout/check-in liền ngày; cancelled reservation; Room Map sau CRUD; Guest/Manager/Admin truy cập URL trực tiếp; desktop/mobile/offcanvas và console runtime.
