# Hotel Management Backend

Java 21, Spring Boot 4, Maven, SQL Server.

## Chạy local

Tạo và seed database `HotelManagement_SBA` bằng các script của nhóm trước.
Đặt biến môi trường `DB_USERNAME`, `DB_PASSWORD`; `DB_HOST` mặc định `localhost`,
`DB_PORT` mặc định `1433`. Không commit thông tin đăng nhập.

Chạy cấu hình main trong IntelliJ với các biến trên hoặc chạy `./mvnw.cmd spring-boot:run`
trong terminal có biến môi trường tương ứng. Server chỉ bind `127.0.0.1`.

## API đọc Module E

| Method | URL | Nội dung |
| --- | --- | --- |
| GET | `/api/operations/issue-types` | Loại sự cố đang hoạt động |
| GET | `/api/operations/issues?page=0&size=20` | Danh sách sự cố mới nhất trước |

`page` bắt đầu từ 0; `size` từ 1 đến 100. API danh sách trả array, chưa có tổng số
bản ghi. Tham số không hợp lệ trả HTTP 400. Trang ngoài phạm vi trả array rỗng.
`createdAt` là thời gian UTC lưu trong DATETIME2 của database, JSON chưa kèm offset.

Danh sách dùng join fetch cho phòng, danh mục, người báo cáo và nhân viên được gán.
Left join giữ lại sự cố chưa được phân công (`assignedStaffId`, `assignedTo` là null).
Chỉ fetch quan hệ to-one để dùng phân trang tại database.

Các entity tham chiếu `IssueRoom`, `IssueUser`, `IssueStaff` là ánh xạ đọc tối thiểu
cho Module E; không chứa mật khẩu và không cung cấp API chỉnh sửa domain A/B.
`Issue` hiện cũng chỉ đọc. Khi thêm API ghi cần thiết kế transaction, validation,
optimistic locking và phân quyền trước khi bỏ chế độ immutable.

Backend chưa có authentication/authorization; API này chỉ dành cho phát triển local.
Trước khi triển khai chia sẻ cần JWT và giới hạn dữ liệu theo quyền/khách sạn.
Frontend dùng API cho danh mục và bảng sự cố ở chế độ chỉ đọc; form tạo vẫn lưu demo.

## Kiểm tra sau khi khởi động lại backend

1. Mở `http://localhost:8080/api/operations/issues`.
2. Với seed ban đầu, có sự cố phòng 103, loại Thiết bị, trạng thái ASSIGNED,
   người báo cáo Reception Demo và người được gán Housekeeper Demo.
3. `/api/operations/issues?page=0&size=1` trả tối đa một bản ghi.
4. `/api/operations/issues?page=999999&size=20` trả `[]` nếu chưa có nhiều dữ liệu.
5. `page=-1`, `size=0`, `size=101` hoặc `page=abc` trả HTTP 400.

Commit gợi ý: `feat(operations): add paginated issue list API with fetch joins`

## Bộ lọc danh sách sự cố

`GET /api/operations/issues?page=0&size=5&room=103&status=ASSIGNED&category=Thiết%20bị`

Các bộ lọc mặc định chuỗi rỗng (không lọc); room tìm chứa chuỗi, status/category khớp chính xác.
Status không hợp lệ trả HTTP 400. Bộ lọc chạy trước phân trang trong SQL.
Frontend hiện đã dùng endpoint này cho bảng sự cố ở chế độ chỉ đọc; form tạo vẫn lưu demo.

## Tạo báo cáo SQL Server — cập nhật mới nhất

Form tạo đã chuyển sang database, không còn ghi demo localStorage. Những mô tả form demo ở phần lịch sử phía trên không còn áp dụng.
Backend chưa có JWT thật, vì vậy POST mặc định tắt. Token mock React không được xem là danh tính database.

### Cấu hình thử trên máy local

Trong IntelliJ Run Configuration của backend:

1. Active profiles: `local-demo`.
2. Environment variables: thêm `OPERATIONS_DEMO_REPORTER_EMAIL=reception@sba.example`.
3. Giữ các biến DB_USERNAME/DB_PASSWORD hiện tại, khởi động lại backend.

Email trên là ví dụ từ seed. Mọi báo cáo thử được gắn với người dùng database cấu hình tại backend;
phải tồn tại và is_active=1. Tên này hiển thị trên form, chưa phải tài khoản React đang đăng nhập.
Đây không phải cơ chế xác thực. Không bật local-demo trên máy chủ chia sẻ hoặc production.
Khi Module A có JWT, thay reporter cấu hình bằng principal đã xác minh, kiểm tra quyền và giới hạn theo khách sạn.

### API mới

| Method | URL | Nội dung |
| --- | --- | --- |
| GET | `/api/operations/issue-rooms` | Phòng hoạt động kèm tên khách sạn |
| GET | `/api/operations/issue-reporting-context` | Trạng thái bật ghi và tên reporter local |
| POST | `/api/operations/issues` | Tạo sự cố OPEN; chỉ bật local-demo có reporter hợp lệ |

Payload POST: `roomId`, `issueTypeId` (ID dương), `title` (1–200), `description` (5–2000),
`priority` (LOW/NORMAL/HIGH/URGENT). Trim trước validation. Không nhận danh tính reporter từ trình duyệt.
Phòng phải hoạt động trong room type/khách sạn hoạt động, loại sự cố phải hoạt động.
Trả HTTP 201 với `{ "id": 2, "status": "OPEN" }` (ID do database cấp, không cố định).
Chưa bật profile/reporter không hoạt động: HTTP 503. Dữ liệu sai: HTTP 400.
Insert bằng JDBC prepared statement và setNString, SQL cấp timestamps/row_version, transaction rollback khi lỗi.
JPA read models giữ immutable; chưa có API cập nhật/phân công/xóa.

### Kiểm tra

- Chạy frontend, vào form, kiểm tra tên reporter cấu hình; chọn phòng/loại, nhập title/description và gửi.
- Bấm Xem danh sách: thấy bản ghi OPEN mới; tải lại vẫn còn và modal có đúng reporter.
- Bỏ profile local-demo và khởi động lại: form khóa gửi, POST trả 503 và không ghi.
- Nếu mất kết nối sau khi gửi: kiểm tra bảng trước khi gửi lại vì chưa có idempotency key.
- Báo cáo localStorage cũ không tự migrate vào database.

Unit tests không cần SQL Server và không ghi dữ liệu thật:

```powershell
.\mvnw.cmd -Dtest=IssueReportServiceTests test
```

Tests bao gồm đóng ghi mặc định, reporter thiếu/inactive, room/type không hợp lệ,
trim/validation và insert đúng reporter, Unicode, ID database. Chưa kiểm thử JDBC tích hợp trên SQL Server thật.
