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

## Phân công sự cố OPEN

Cấu hình IntelliJ backend:

- Active profiles: `local-demo`.
- Giữ `OPERATIONS_DEMO_REPORTER_EMAIL` để tạo báo cáo.
- Thêm `OPERATIONS_DEMO_MANAGER_EMAIL=manager@sba.example` (tài khoản seed Manager Demo).

Reporter và manager là hai cấu hình riêng. Manager phải là user active có vai trò ADMIN/MANAGER active.
MANAGER phải có bản ghi staff active cùng khách sạn sự cố; ADMIN được quản lý các khách sạn hoạt động.
Đây vẫn là danh tính local cấu hình ở backend, không phải xác thực JWT. Không triển khai chia sẻ chế độ này.

| Method | Endpoint | Kết quả |
| --- | --- | --- |
| GET | `/api/operations/issue-assignment-context` | Trạng thái bật phân công và tên manager local |
| GET | `/api/operations/issues/{id}/assignees` | Staff active/user active/role STAFF active cùng khách sạn |
| PATCH | `/api/operations/issues/{id}/assignment` | Body `{ "staffId": 3 }`; OPEN chưa gán → ASSIGNED |

PATCH lưu assigned_staff_id, assigned_by (user ID manager do backend xác định), updated_at (UTC).
Không nhận assigned_by từ frontend. Conditional UPDATE chỉ tác động khi status=OPEN và chưa có assignee.
Hai thao tác đồng thời: thao tác tới sau nhận 409; không ghi đè phân công trước.
Mã lỗi: 400 staff sai/không phù hợp, 403 manager khác khách sạn, 404 không có sự cố active,
409 sự cố không còn OPEN hoặc đã được gán, hay có xung đột, 503 chưa bật manager local hợp lệ.

### Chạy thử

1. Khởi động lại backend với profile và biến trên, chạy frontend.
2. Đăng nhập tài khoản Manager/Admin trên React (quyền HOUSEKEEPING_MANAGE).
3. Tạo báo cáo mới để có trạng thái OPEN. Bản ghi seed #1 đã ASSIGNED nên không có nút Phân công.
4. Trong bảng, bấm Phân công, kiểm tra tên manager local, chọn nhân viên và xác nhận.
5. Bảng tự tải lại giữ bộ lọc; trạng thái ASSIGNED, Chi tiết có tên người được gán, tải trang vẫn còn.
6. Nếu đang lọc OPEN, bản ghi vừa phân công biến mất khỏi kết quả theo đúng bộ lọc.
7. Hai cửa sổ cùng mở modal cho một sự cố OPEN: cửa sổ thứ hai xác nhận sau phải báo xung đột.
8. Bỏ biến manager/profile: modal khóa gửi. Manager khác khách sạn/staff inactive không được phân công.

Chưa có tái phân công hoặc nhận việc/hoàn tất, chưa tự tạo housekeeping task.
Không thay đổi schema SQL. Frontend ẩn nút với tài khoản thiếu HOUSEKEEPING_MANAGE;
backend kiểm tra manager theo cấu hình local, cần thay bằng principal JWT khi tích hợp Module A.

Kiểm thử unit: `./mvnw.cmd -Dtest=IssueAssignmentServiceTests,IssueReportServiceTests test`.
11 test phân công và 7 test tạo báo cáo dùng JDBC giả lập; không thay thế kiểm thử trên SQL Server thật.

## Nhân viên nhận xử lý và hoàn tất sự cố (Module E)

Giữ profile `local-demo` và thêm biến môi trường IntelliJ:
`OPERATIONS_DEMO_STAFF_EMAIL=housekeeper@sba.example` (user seed Housekeeper Demo, staff ID 3).
Khởi động lại backend. Cấu hình reporter/manager vẫn riêng, không thay thế bằng staff email.
Danh tính nhân viên local phải là user/staff/hotel active và role STAFF active.
Không thay đổi đăng nhập, JWT hay module của thành viên khác.

| Method | Endpoint | Nghiệp vụ |
| --- | --- | --- |
| GET | `/api/operations/issue-work-context` | Trạng thái bật xử lý và danh tính staff local |
| PATCH | `/api/operations/issues/{id}/start` | ASSIGNED → IN_PROGRESS, body rỗng |
| PATCH | `/api/operations/issues/{id}/resolve` | IN_PROGRESS → RESOLVED, body `{ "resolutionNote": "Đã sửa xong điều hòa" }` |

Chỉ staff đang được giao sự cố và cùng khách sạn được cập nhật. Manager không được dùng thao tác này để bỏ qua bước nhận việc.
Backend không nhận staffId/status từ request. Ghi chú xử lý bắt buộc 5–2000 ký tự sau trim.
Ghi chú lưu NVARCHAR bằng setNString; resolved_at/updated_at do SQL Server cấp UTC.
Không ghi vào các bảng Module A/B; chỉ đọc dữ liệu tham chiếu. Không đổi schema và không tự tạo/cập nhật housekeeping tasks.

Conditional UPDATE kiểm tra ID, assignee và trạng thái nguồn; thao tác tới sau khi dữ liệu đổi trả 409.
Lỗi 403: khác assignee/khách sạn. 404: không có sự cố hoặc phòng/khách sạn đã ngừng hoạt động.
503: chưa bật staff local hợp lệ. Ghi chú không hợp lệ: 400. Không hỗ trợ đi lùi trạng thái/mở lại sự cố.
GET danh sách bổ sung assignedStaffId, resolutionNote và resolvedAt để frontend hiển thị chi tiết.

### Chạy thử local

1. Cấu hình staff như trên rồi khởi động lại backend; chạy frontend.
2. Đăng nhập React bằng tài khoản nhân viên (ví dụ housekeeper@hotel.com của mock), có quyền UC-E5.
3. Vào Quản lý sự cố. Chọn sự cố ASSIGNED cho Housekeeper Demo (bản ghi seed #1 nếu chưa thay đổi).
4. Bấm Nhận xử lý, kiểm tra danh tính local, xác nhận: trạng thái IN_PROGRESS.
5. Bấm Hoàn tất, thử ghi chú trống/ngắn: bị chặn. Nhập ghi chú hợp lệ: RESOLVED.
6. Mở Chi tiết: thấy ghi chú và thời gian hoàn tất; tải lại trang vẫn còn.
7. Thử sự cố giao cho người khác: modal khóa thao tác/backend 403. Thử hai cửa sổ cùng thao tác: cửa sổ cập nhật sau nhận 409.
8. Nếu đang lọc trạng thái cũ, bản ghi cập nhật có thể biến mất theo bộ lọc; Đặt lại để xem.

Frontend chỉ hiển thị thao tác cho role STAFF + UC-E5; backend dùng danh tính cấu hình local và kiểm tra assignee.
Đây chưa phải xác thực JWT. Mọi hành động trong local-demo chạy dưới staff cấu hình, không phải phiên React.
Không triển khai chia sẻ chế độ này. Phần JWT để Module A tích hợp sau.

Unit tests: `./mvnw.cmd -Dtest=IssueProgressServiceTests,IssueAssignmentServiceTests,IssueReportServiceTests test`.
Có 30 unit test (12 tiến độ, 11 phân công, 7 tạo) dùng JDBC giả lập, không ghi SQL Server thật.
Cần thực hiện các bước chạy thử ở trên để kiểm tra tích hợp SQL Server.
