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
