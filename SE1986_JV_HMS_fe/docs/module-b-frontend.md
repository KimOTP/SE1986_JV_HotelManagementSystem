# Module B — tích hợp backend

Tài liệu này thay thiết kế API đề xuất cũ. Contract chính thức và cách chạy Windows:
[backend Module B](../../SE1986_JV_HMS_be/docs/module-b-api.md).

## Trạng thái UC

| UC | FE kết nối |
|---|---|
| B1 | CRUD loại phòng, tiện nghi liên kết, upload JPG/PNG tối đa 6 ảnh, active |
| B2 | CRUD phòng vật lý, tầng âm/0, notes, active; không ghi trạng thái vận hành |
| B3 | CRUD tiện nghi: tên, mô tả, trạng thái active |
| B4 | Public search dùng stored procedure qua backend, không tính từ mock |
| B5 | Detail dùng roomTypeId; availability/recheck rồi handoff Module C |
| B6 | Room Map dùng dữ liệu DB, refresh, filter/thống kê, hiển thị hai trạng thái gốc |

Đã triển khai code; kiểm chứng SQL Server/CRUD qua browser cần môi trường DB và đăng nhập thật.
Không coi test adapter hoặc test security mock là kiểm chứng DB/end-to-end.

## Cấu hình API

```dotenv
VITE_AUTH_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

Chạy `npm ci`, `npm run dev`; khởi động lại Vite sau khi đổi env.
Không để JWT secret/DB password trong VITE_*. AuthProvider và axiosClient sẵn có xử lý JWT/refresh.
Module B chỉ dùng HTTP API, không còn thư mục mocks hoặc bộ chọn nguồn dữ liệu.
`VITE_ROOMS_DATA_SOURCE` không còn được đọc; nếu biến cũ vẫn có trong env thì không ảnh hưởng.
Không fallback sang dữ liệu giả khi backend lỗi. Availability chỉ được tính ở backend.

## Adapter

Mọi đường dẫn tương đối bắt đầu `/inventory` vì baseURL đã chứa `/api`.
`getCatalog()` gọi `/public/catalog`, chỉ có roomTypes/amenities, không đọc phòng nội bộ.
`getAll(kind)` dành cho quản trị, chỉ gọi resource và options cần cho form:
roomTypes dùng UC-B1; rooms dùng UC-B2; amenities dùng UC-B3.
`getMap()` gọi `/room-map`, chỉ cần UC-B6; MANAGER/RECEPTIONIST/HOUSEKEEPER không cần B1/B2/B3.
Theo seed mới, ADMIN chỉ quản trị B1/B2/B3, không có B6; Module B kiểm tra quyền UC, không hardcode role.
Public search/detail không dùng getAll. Router cho người có UC-B6 truy cập trực tiếp Room Map;
không cần sửa guard/router/sidebar chung.

`api/roomsApi.js` chứa toàn bộ lời gọi HTTP và mapping, unwrap JSON trực tiếp hoặc envelope data tại boundary,
chuẩn hóa mọi ID thành string. Các trang chỉ import `roomsApi`, không còn file repository HTTP riêng.
Backend cũng trả ID dạng chuỗi BIGINT. BasePrice dạng chuỗi decimal giữ chính xác khi edit/save;
hiển thị tiền dùng formatter hiện có. Chỉ gửi whitelist trường catalog, không gửi hotelId/status/audit.

Backend availability trả DTO với availableRooms=0 khi hết chỗ; adapter đổi trường hợp này thành null
để giữ hành vi UI. Inactive trả 410, không tồn tại 404, ngày sai 400; UI hiển thị message API.
Backend catalog hiện dùng Spring Data JPA. Database phải có notes và room_type_images trước khi khởi động;
schema hoàn chỉnh đã chứa cả hai. Xem tài liệu backend nếu database còn dùng schema cũ.
Khi backend chưa bật extension, ghi ảnh/notes bị từ chối 409, không báo thành công giả.

## Upload ảnh

Trong form loại phòng, chọn ảnh từ máy, chờ preview rồi bấm Lưu.
Chỉ chọn ảnh từ máy, không có ô dán URL. JPG/PNG, tối đa 5 MB mỗi ảnh và 6 ảnh tổng cộng
(tính cả ảnh đã có và ảnh vừa chọn).
Client kiểm tra file trước khi gửi; backend kiểm tra nội dung ảnh thực, kích thước và quyền UC-B1.
File được gửi trực tiếp qua axiosClient/JWT với Content-Type image/jpeg hoặc image/png đến
`POST /inventory/admin/images`; kết quả `{url}` gắn vào mảng images hiện có.
Ảnh được đọc public qua `/api/inventory/public/images/{name}`.
Không cho lưu form trong lúc đang upload, hủy request khi đóng form; lỗi upload hiển thị tại form.
Nếu upload nhiều file mà một file lỗi, các ảnh đã upload thành công vẫn ở preview.
Binary ảnh nằm trong thư mục bền vững của backend; database lưu URL khi Lưu. Không có thay đổi schema.
Xóa ảnh khỏi form không tự xóa file trên server. Cấu hình đường dẫn/URL server và giới hạn chi tiết xem tài liệu backend.

## Room Map và tiện nghi

Backend trả operationalStatus (AVAILABLE/OCCUPIED/MAINTENANCE), housekeepingStatus
(DIRTY/CLEANING/CLEAN), displayStatus (READY/OCCUPIED/DIRTY/MAINTENANCE).
Adapter giữ rawOperationalStatus, housekeepingStatus rồi dùng displayStatus ở field operationalStatus
cho component UI cũ. Ưu tiên MAINTENANCE, OCCUPIED, DIRTY/CLEANING, READY.
Modal hiện cả trạng thái gốc; active riêng biệt. Không ghi giá trị hiển thị vào DB.
Refresh lỗi hiển thị lỗi đồng thời giữ snapshot cũ; không giả vờ đã tải dữ liệu mới.

Tiện nghi chỉ có tên, mô tả và trạng thái. Các trang quản trị, tìm phòng và chi tiết phòng
hiển thị tên tiện nghi, không dùng biểu tượng. API đọc/ghi tương ứng với contract backend.

## Handoff và giới hạn

Luồng search → detail → availability/recheck → `/rooms/booking-handoff` giữ
roomTypeId/checkIn/checkOut/guests/roomCount. Module B không tạo booking/hold.
Router dùng trang handoff của Module C; đã gỡ trang placeholder không còn dùng trong Rooms.
Module C tự chọn mock/API qua `VITE_BOOKING_DATA_SOURCE`; cấu hình của C độc lập với Module B.
Handoff thành công không chứng minh booking đã ghi SQL Server nếu C chưa bật API.
Tạo booking phải kiểm tra availability lại trong transaction của C.

## Kiểm tra

```powershell
npm run build
npm run lint
node --test src/modules/rooms/tests/*.test.mjs
```

Kiểm tra trên môi trường thật: Guest search/detail không đăng nhập; Admin CRUD từng danh mục,
refresh để xác nhận persistence; thử trùng tên/số phòng, xóa bản ghi tham chiếu, dữ liệu sai;
MANAGER/RECEPTIONIST/HOUSEKEEPER mở trực tiếp `/admin/room-map`; ADMIN/CUSTOMER bị chặn theo seed mới.
Thay đổi trạng thái qua quy trình
D/E rồi refresh map. Kiểm tra PENDING hết hold mà status chưa đổi, ngày checkout trùng check-in,
phòng OCCUPIED ở hiện tại khi tìm ngày tương lai và AVAILABLE/DIRTY.
Không sửa booking thật/chạy lại seed để làm mới hold.

## Tách dữ liệu mock Module D khỏi Module B

Đã gỡ `rooms/mocks/seedData.js`. Module D dùng bảng giá demo riêng trong
`frontdesk/mocks/frontdeskStore.js`, giữ nguyên các giá trước đây và không import mock từ Rooms.
Module B chỉ dùng API; Module D vẫn dùng mock cho đến khi người phụ trách D tích hợp API.
