> Cập nhật hiện tại: Module E đã dùng JWT, bỏ danh tính local-demo. Xem [hướng dẫn test JWT](docs/module-e-jwt-test.md). Các ghi chú local-demo bên dưới là lịch sử và không còn áp dụng.

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
| GET | `/api/operations/issues/{id}/assignees` | Staff active/user active/role HOUSEKEEPER active cùng khách sạn |
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
Danh tính nhân viên local phải là user/staff/hotel active và role HOUSEKEEPER active.
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

Frontend chỉ hiển thị thao tác cho role HOUSEKEEPER + UC-E5; backend dùng danh tính cấu hình local và kiểm tra assignee.
Đây chưa phải xác thực JWT. Mọi hành động trong local-demo chạy dưới staff cấu hình, không phải phiên React.
Không triển khai chia sẻ chế độ này. Phần JWT để Module A tích hợp sau.

Unit tests: `./mvnw.cmd -Dtest=IssueProgressServiceTests,IssueAssignmentServiceTests,IssueReportServiceTests test`.
Có 30 unit test (12 tiến độ, 11 phân công, 7 tạo) dùng JDBC giả lập, không ghi SQL Server thật.
Cần thực hiện các bước chạy thử ở trên để kiểm tra tích hợp SQL Server.

## UC-E2: Công việc của tôi từ SQL Server

Màn hình `/operations/my-tasks` đã thay danh sách mock bằng database.
Dùng lại staff context trong Module E, giữ `local-demo` và biến
`OPERATIONS_DEMO_STAFF_EMAIL=housekeeper@sba.example` trong cấu hình Run backend.
Danh tính này vẫn do backend cấu hình, không phải phiên JWT hay tên hiển thị React.
Không sửa module đăng nhập, Inventory hoặc Booking/Billing.

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| GET | `/api/operations/my-tasks?page=0&size=5&room=&status=&type=` | Task được giao cho staff local, cùng khách sạn |
| PATCH | `/api/operations/my-tasks/{id}/start` | PENDING → IN_PROGRESS |
| PATCH | `/api/operations/my-tasks/{id}/complete` | IN_PROGRESS → COMPLETED |

Không nhận staffId từ frontend; backend lấy staff ID và hotel ID từ context local đã kiểm tra active/role.
Bộ lọc phòng chứa chuỗi; status: PENDING/IN_PROGRESS/COMPLETED/CANCELLED, type: CLEANING/MAINTENANCE.
Lọc trước phân trang, page từ 0, size 1–100. Sắp theo lịch thực hiện rồi task ID. API trả array, chưa có tổng số.
Trước/Sau có thể mở thêm một trang rỗng nếu trang cuối có đúng size bản ghi.
Chỉ hiện task có phòng/room type/khách sạn active. Staff không còn hợp lệ hoặc profile chưa bật: 503.

Bắt đầu lưu started_at; hoàn thành lưu completed_at; updated_at do SQL Server cấp UTC.
Chỉ nhân viên được giao và cùng khách sạn được thao tác (403 nếu sai); 404 nếu không còn task active.
Sai trạng thái hoặc cập nhật đồng thời trả 409; không cho mở lại task đã COMPLETED/CANCELLED.
Conditional update kiểm tra cả staff, trạng thái và timestamps để không ghi đè lịch sử.
Chỉ ghi operations.tasks; không tự sửa trạng thái phòng hoặc sự cố liên kết.
Các thao tác sự cố và task hiện tách riêng; Bảng công việc của Manager/Dashboard vẫn chưa nối database.

### Kiểm tra UC-E2

1. Restart backend với local-demo/staff email như trên, chạy frontend.
2. Đăng nhập React bằng tài khoản nhân viên có UC-E2, mở Công việc của tôi.
3. Với seed ban đầu, Housekeeper Demo có hai task: Kiểm tra phòng 103 và Dọn phòng 202.
4. Thử lọc phòng, loại, trạng thái; Đặt lại để thấy tất cả task của nhân viên local.
5. Bắt đầu một task PENDING: IN_PROGRESS, Chi tiết có thời gian bắt đầu.
6. Hoàn thành task đó: COMPLETED, Chi tiết có thời gian hoàn thành; reload vẫn giữ.
7. Nếu lọc trạng thái cũ, task có thể biến mất theo bộ lọc sau khi cập nhật.
8. Hai cửa sổ thao tác cùng task: thao tác cập nhật sau phải nhận 409.
9. Thử tài khoản DB khác có role HOUSEKEEPER hoặc bỏ profile để kiểm tra dữ liệu theo danh tính/khóa thao tác.

Unit tests không ghi database thật:
`./mvnw.cmd -Dtest=MyTaskServiceTests,IssueProgressServiceTests,IssueAssignmentServiceTests,IssueReportServiceTests test`.
40 test đạt (10 task + 30 sự cố); kiểm tra tích hợp SQL Server cần chạy các bước trên.

## UC-E1: Manager tạo và giao công việc — bản local mới nhất

Bảng `/operations/tasks` đã chuyển từ mock sang SQL Server; nội dung cũ ghi bảng Manager còn mock là lịch sử trước bước này.
Manager/Admin có HOUSEKEEPING_MANAGE và UC-E1 trên React xem bảng và mở form Tạo và giao việc.
Backend vẫn dùng `local-demo`, `OPERATIONS_DEMO_MANAGER_EMAIL=manager@sba.example` như bước phân công sự cố.
Không sửa đăng nhập/JWT hoặc module của người khác.

| Method | URL | Nội dung |
| --- | --- | --- |
| GET | `/api/operations/tasks?page=0&size=12&room=&status=&type=` | Bảng task theo phạm vi manager local |
| GET | `/api/operations/task-rooms` | Phòng active trong khách sạn manager quản lý |
| GET | `/api/operations/task-assignees?roomId=3` | HOUSEKEEPER active cùng khách sạn với phòng |
| POST | `/api/operations/tasks` | Tạo task và giao nhân viên, trạng thái PENDING |

Payload POST: roomId, staffId, taskType (CLEANING/MAINTENANCE), title (1–200 sau trim),
description (tùy chọn, tối đa 2000), priority (LOW/NORMAL/HIGH/URGENT), scheduledAt (bắt buộc).
Frontend nhập lịch theo giờ máy người dùng, chuyển sang UTC; backend nhận LocalDateTime UTC không có offset.
Ví dụ 31/10/2026 19:00 Bangkok gửi `2026-10-31T12:00:00.000`. SQL Server lưu DATETIME2 UTC.
Có thể ghi nhận lịch đã qua; không tự động chạy task theo lịch. Năm phải trong phạm vi DATETIME2 1–9999.

Backend lấy assigned_by từ manager local, không nhận ID người giao việc từ payload.
MANAGER chỉ chọn phòng thuộc khách sạn có staff membership active; ADMIN quản lý khách sạn active.
Phòng/room type/hotel active; staff/user/role HOUSEKEEPER active cùng khách sạn phòng. SQL insert dùng prepared statement,
setNString cho tiếng Việt và transaction; DB cấp ID/timestamps/row_version.
POST trả 201 với id và status PENDING; 400 dữ liệu/phòng/nhân viên sai, 403 khác phạm vi, 503 manager chưa cấu hình hợp lệ.
Chưa tạo liên kết issue_id trong form mới (để null), chưa sửa/hủy/tái phân công task có sẵn.
Không tự cập nhật phòng hay sự cố.

Bảng hiển thị các cột PENDING, IN_PROGRESS, COMPLETED, CANCELLED theo 12 task trong trang.
Số đếm trên cột chỉ tính trang hiện tại; không phải tổng thống kê Dashboard.
Lọc thực hiện trước phân trang; sau tạo thành công quay trang đầu và xóa bộ lọc để thấy task mới nhất.
API chưa có tổng số; Trước/Sau có thể mở thêm một trang rỗng nếu trang cuối đủ đúng size bản ghi.

### Chạy thử UC-E1 → UC-E2

1. Giữ profile local-demo và cả OPERATIONS_DEMO_MANAGER_EMAIL, OPERATIONS_DEMO_STAFF_EMAIL như trước; restart backend.
2. Đăng nhập React bằng Manager/Admin, mở Bảng công việc → Tạo và giao việc.
3. Chọn phòng, chọn Housekeeper Demo, tiêu đề, loại việc, ưu tiên và lịch thực hiện; gửi.
4. Kiểm tra thẻ PENDING mới, đúng nhân viên, người giao việc và giờ hiển thị trong Chi tiết; reload vẫn còn.
5. Đăng nhập React bằng nhân viên có UC-E2, vào Công việc của tôi: tìm task mới theo phòng/loại hoặc chuyển trang.
6. Bắt đầu và hoàn thành task; quay lại bảng Manager, bấm Tải lại để thấy IN_PROGRESS/COMPLETED.
7. Thử title trắng/quá dài, thiếu lịch, không chọn nhân viên: bị chặn; đổi phòng phải chọn lại nhân viên.
8. Tắt backend: form/bảng báo lỗi, không dùng mock thay thế. Nếu mất kết nối khi gửi, kiểm tra bảng trước khi gửi lại để tránh trùng.

50 unit test Module E đạt, gồm 10 test TaskManagementServiceTests mới. Các test dùng JDBC giả lập, không ghi SQL Server thật.
Chưa thực hiện kiểm thử tích hợp SQL Server trong phiên này; cần chạy các bước trên.
UC-E1 đã được người dùng duyệt để commit/push lên DucHM.

## Bản hoàn thiện nghiệp vụ Module E

Tài liệu hiện tại: [docs/module-e-final.md](docs/module-e-final.md).
Bao gồm đủ 6 UC dùng SQL Server; dashboard polling, feedback customer/manager, quyền đường dẫn Module E và checklist kiểm thử.
JWT tạm hoãn theo yêu cầu; local-demo có sẵn mặc định email seed trong application-local-demo.properties, không chứa mật khẩu.
Các mục trước đây mô tả quá trình từng bước, một số thông tin mock/chưa tích hợp không còn áp dụng.


## Authentication from main

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

Đã có JWT (xem mục "Đăng nhập JWT"); các API của Module E cần tự gắn `@PreAuthorize` theo mã UC.
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

## Đăng nhập JWT (Module A)

### Cài đặt local

**Cập nhật vai trò (tách STAFF thành Lễ tân và Buồng phòng):** DB đã có dữ liệu cần chạy
`scripts/migrate-split-staff-role.sql` một lần (chạy lại vẫn an toàn). Script tạo vai trò `RECEPTIONIST` và `HOUSEKEEPER`,
chuyển người dùng STAFF sang vai trò mới theo chức danh (có "dọn phòng", "buồng" → Buồng phòng, còn lại → Lễ tân) rồi xóa vai trò STAFF.
Người đang đăng nhập từ trước cần đăng xuất rồi đăng nhập lại để nhận vai trò mới. DB tạo mới từ `docs/sql/02_seed_demo.sql` đã có sẵn hai vai trò này.

0. Chép `.env.example` thành `.env` và điền mật khẩu DB. Database tạo từ schema cũ cần chạy
   `scripts/migrate-existing-db-module-b.sql` (chỉ thêm phần còn thiếu, không xóa dữ liệu).
1. Thêm `JWT_SECRET_BASE64` vào `.env` (xem `.env.example`; tạo bằng `openssl rand -base64 64`).
   Thiếu biến này app vẫn chạy nhưng tự sinh khóa tạm, nên phải đăng nhập lại sau mỗi lần restart.
2. Tài khoản seed: `admin@sba.example`, `manager@sba.example`, `reception@sba.example`,
   `housekeeper@sba.example`, `customer@sba.example`. Chạy `scripts/dev-reset-passwords.sql`
   trên DB local để đặt mật khẩu chung `123456` cho các tài khoản này.
3. Frontend: trong `SE1986_JV_HMS_fe/.env` đặt `VITE_AUTH_DATA_SOURCE=api` và
   `VITE_API_BASE_URL=http://localhost:8080/api`, rồi đăng nhập bằng tài khoản seed.

### API

| Method | URL | Body | Kết quả |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ fullName, email, password }` | 201 kèm `user`; tạo CUSTOMER, đăng nhập được ngay (không xác thực qua email). Trùng email trả 409 |
| POST | `/api/auth/forgot-password` | `{ email }` | Luôn trả 200 cùng một câu; nếu email có tài khoản thì gửi mã OTP 6 số (UC-A3) |
| POST | `/api/auth/reset-password` | `{ email, otp, newPassword }` | 204; sai hoặc hết hạn trả 400 `INVALID_OTP`; thu hồi mọi phiên cũ (UC-A3) |
| POST | `/api/auth/login` | `{ email, password }` | `{ accessToken, refreshToken, tokenType, expiresIn, user }` |
| POST | `/api/auth/refresh` | `{ refreshToken }` | Cặp token mới; refresh token cũ hết hiệu lực |
| POST | `/api/auth/logout` | `{ refreshToken }` | 204 |
| GET | `/api/auth/me` | — | `user` (cần Bearer token) |
| PUT | `/api/users/me/profile` | `{ fullName, phone }` | `user` sau khi cập nhật; không đổi được email và role (UC-A4) |
| PUT | `/api/users/me/password` | `{ currentPassword, newPassword }` | Cặp token mới; mọi phiên cũ bị thu hồi (UC-A4) |
| GET | `/api/admin/users` | — | Danh sách tài khoản (UC-A5) |
| POST | `/api/admin/users` | `{ fullName, email, role, jobTitle, password }` | Tạo MANAGER/RECEPTIONIST/HOUSEKEEPER kèm dòng `staff` (UC-A5) |
| PUT | `/api/admin/users/{id}` | `{ fullName, email, role, jobTitle }` | Sửa MANAGER/RECEPTIONIST/HOUSEKEEPER; không tự đổi vai trò của mình (UC-A5) |
| PATCH | `/api/admin/users/{id}/status` | `{ enabled }` | Khóa hoặc mở khóa MANAGER/RECEPTIONIST/HOUSEKEEPER; khóa thì thu hồi mọi phiên (UC-A5) |
| GET | `/api/admin/roles` | — | Danh sách role kèm mã UC (UC-A6) |
| PUT | `/api/admin/roles/{code}/permissions` | `{ permissions: ["UC-.."] }` | Thay toàn bộ quyền của role, có hiệu lực ngay; ADMIN luôn giữ đủ 30 quyền (UC-A6) |
| POST | `/api/admin/users/{id}/reset-password` | — | `{ temporaryPassword }` chỉ trả một lần; thu hồi mọi phiên của người đó (UC-A5) |

`user` gồm `id, fullName, email, phone, role, roles, permissions (mã UC), jobTitle, hotelId, emailVerified, enabled`.
Access token sống 15 phút, refresh token 7 ngày. FE (`axiosClient`) tự gắn
`Authorization: Bearer ...` và tự refresh khi gặp 401.

### Quên mật khẩu (OTP qua email)

1. Người dùng nhập email ở trang Quên mật khẩu; backend gửi mã 6 số, hiệu lực 10 phút (`OTP_TTL_MINUTES`).
2. Người dùng nhập mã cùng mật khẩu mới. Mã chỉ dùng được một lần; nhập sai 5 lần (`OTP_MAX_ATTEMPTS`) thì mã bị hủy.
3. Xin mã mới phải chờ 60 giây (`OTP_RESEND_COOLDOWN_SECONDS`). Mã cũ bị hủy khi có mã mới.
4. Đổi xong, mọi phiên đăng nhập cũ bị đăng xuất. DB chỉ lưu bản băm của mã (bảng `auth_tokens`, `purpose = PASSWORD_RESET`).

Đăng ký không cần OTP. Quản trị viên vẫn có nút "Đặt lại mật khẩu" ở màn Quản lý tài khoản (mật khẩu tạm) cho trường hợp người dùng không nhận được mail.
Access token đã phát trước đó vẫn dùng được tới khi hết hạn (tối đa 15 phút).

### Cấu hình gửi mail

Đặt trong `.env` (xem `.env.example`): `MAIL_HOST`, `MAIL_PORT` (mặc định 587), `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`.
Với Gmail: bật xác thực 2 bước rồi tạo **mật khẩu ứng dụng** (App password), `MAIL_HOST=smtp.gmail.com`; không dùng mật khẩu đăng nhập Gmail.

- Để trống `MAIL_HOST`: backend **không gửi mail**, chỉ ghi mã OTP vào log để phát triển. Không dùng cách này khi triển khai thật.
- Gửi mail lỗi (SMTP tắt, sai mật khẩu): API vẫn trả 200 để không lộ email nào đã đăng ký; lỗi được ghi vào log, người dùng xin lại mã sau.
- Không commit `.env`.

### Dùng trong module khác

Hiện mọi đường dẫn ngoài `/api/auth/**` vẫn mở (giai đoạn chuyển tiếp). Module nào cần
bảo vệ thì gắn `@PreAuthorize` theo mã UC; chưa đăng nhập trả 401, thiếu quyền trả 403.

```java
@GetMapping
@PreAuthorize("hasAuthority('UC-E5')")          // hoặc hasRole('MANAGER')
public List<IssueResponse> getIssues(@AuthenticationPrincipal AuthUserDetails currentUser) {
    Long userId = currentUser.getId();          // getEmail(), getHotelId(), getRoles(), getPermissions()
    ...
}
```

- `AuthUserDetails` nằm ở `com.hotel.hms.identity.security`.
- `Principal#getName()` trả về email (Module D đang dùng cách này).
- Quyền được đọc lại từ DB ở mỗi request, nên đổi quyền hoặc khóa tài khoản có hiệu lực ngay.

