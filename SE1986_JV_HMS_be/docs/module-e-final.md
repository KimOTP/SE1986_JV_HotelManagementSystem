> Cập nhật hiện tại: Module E đã dùng JWT, bỏ danh tính local-demo. Xem [hướng dẫn test JWT](module-e-jwt-test.md). Các ghi chú local-demo bên dưới là lịch sử và không còn áp dụng.

# Module E — bàn giao nghiệp vụ (JWT tạm hoãn)

Hoàng Minh Đức. Tài liệu này mô tả bản hiện tại; các mục từng bước trong README cũ là lịch sử phát triển.
Toàn bộ 6 màn hình Operations đọc/ghi SQL Server, không fallback sang dữ liệu mock/localStorage.
Các bản ghi có tên Demo là dữ liệu seed trong database.

## Phạm vi hoàn thành

| UC | Màn hình | Nghiệp vụ |
| --- | --- | --- |
| E1 | Bảng công việc | Manager/Admin xem task theo khách sạn, lọc/phân trang, tạo và giao việc cho staff active cùng khách sạn |
| E2 | Công việc của tôi | Chỉ task được giao cho staff local; bắt đầu/hoàn thành và lưu timestamps, chặn sai người/trạng thái/xung đột |
| E3 | Tổng quan vận hành | Thống kê toàn bộ hoặc theo ngày/múi giờ, task quá hạn, ưu tiên cao, workload nhân viên; tự tải lại mỗi 30 giây |
| E4 | Báo cáo sự cố | Chọn phòng/loại từ DB, validate title/description/priority, lưu OPEN |
| E5 | Quản lý sự cố | Lọc/phân trang/chi tiết; OPEN → ASSIGNED → IN_PROGRESS → RESOLVED; lưu ghi chú và thời gian |
| E6 | Đánh giá & phản hồi | Customer đánh giá booking đã CHECKED_OUT một lần; Manager xem/lọc/phản hồi một lần trong phạm vi khách sạn |

Không đổi schema SQL, không sửa đăng nhập/JWT hoặc ghi vào bảng của module khác.
Các thay đổi App.jsx/sidebarMenu.jsx chỉ đăng ký quyền/đường dẫn của 6 màn hình Module E theo UC-E1…UC-E6.
Các màn hình form dùng React Hook Form và Zod; backend Jakarta Validation, transaction, prepared statement, Unicode.
Danh sách sự cố hiện dùng join fetch quan hệ to-one, tránh N+1. Các màn hình task/dashboard/feedback dùng truy vấn SQL join trực tiếp.

## Chạy ứng dụng

1. Java 21; database HotelManagement_SBA đã tạo và seed bằng script nhóm.
2. IntelliJ Run backend:
   - Active profiles: `local-demo`.
   - DB_USERNAME, DB_PASSWORD: tài khoản SQL Server riêng của bạn.
   - DB_HOST mặc định localhost, DB_PORT mặc định 1433.
3. application-local-demo.properties có sẵn 4 danh tính seed để không phải nhập từng email:

| Chức năng | Danh tính mặc định trong DB | Biến tùy chọn để đổi |
| --- | --- | --- |
| Báo sự cố | reception@sba.example | OPERATIONS_DEMO_REPORTER_EMAIL |
| Manager/Admin | manager@sba.example | OPERATIONS_DEMO_MANAGER_EMAIL |
| Staff | housekeeper@sba.example | OPERATIONS_DEMO_STAFF_EMAIL |
| Customer | customer@sba.example | OPERATIONS_DEMO_CUSTOMER_EMAIL |

Các biến nếu có sẽ ghi đè giá trị mặc định. Xóa biến rỗng trong Run Configuration nếu muốn dùng mặc định.
Không bật profile trên production. Không có profile thì phần danh tính/ghi dữ liệu bị khóa.
Đây là cách thử nghiệp vụ local bằng người dùng DB, không phải cơ chế đăng nhập. React mock và DB là hai bộ danh tính riêng.
Tên người thao tác local được hiển thị trên form/modal. JWT sẽ tích hợp sau vào context của Module E.

4. Frontend: trong SE1986_JV_HMS_fe chạy `npm run dev`, mở địa chỉ Vite hiển thị.
5. Tài khoản React seed mock (mật khẩu 123456): manager@hotel.com, housekeeper@hotel.com, customer@hotel.com; admin@hotel.com nếu cần.
6. Dùng menu Operations. Customer có Báo cáo sự cố và Đánh giá & phản hồi, không được mở dashboard/quản lý nội bộ.

## Quy tắc nghiệp vụ

### Công việc

- Tạo luôn được gán nhân viên, trạng thái PENDING.
- Staff được giao: PENDING → IN_PROGRESS → COMPLETED. Không mở lại task COMPLETED/CANCELLED.
- scheduledAt nhập theo giờ trình duyệt, chuyển UTC trước khi gửi. startedAt/completedAt do SQL Server cấp UTC.
- Task hiện không tự cập nhật trạng thái phòng/sự cố liên quan. Không ghi dữ liệu Inventory hoặc Booking/Billing.
- Tạo task mới không tự gắn issue_id; task seed có liên kết vẫn hiển thị bình thường.
- Chưa có thao tác hủy/tái phân công/sửa task: đây không nằm trong 6 UC đã thống nhất.
- Bảng Manager phân nhóm trong trang hiện tại (12 task/trang); số đếm cột không phải tổng thống kê.
- Dashboard thống kê toàn bộ dữ liệu trong ngày chọn/phạm vi khách sạn, không chỉ trang hiện tại.

### Dashboard

- Mặc định giao diện xem Tất cả thời gian (`allTime=true`) để đối chiếu với Bảng công việc. Chọn Theo ngày để lọc riêng một ngày.
- Khi lọc ngày, backend chuyển múi giờ trình duyệt thành khoảng UTC [đầu ngày, đầu ngày kế tiếp).
- Trong chế độ Theo ngày, task tính theo scheduled_at; sự cố đang chờ tính theo created_at trong ngày chọn.
- Quá hạn: PENDING/IN_PROGRESS có scheduled_at < giờ UTC hiện tại; không tính COMPLETED/CANCELLED.
- Tỷ lệ hoàn thành loại task CANCELLED khỏi mẫu số. Không có task hợp lệ thì 0%.
- Workload có cả nhân viên active chưa có task (0), và nhân viên ngừng hoạt động còn task lịch sử.
- Danh sách ưu tiên/sự cố tối đa 5 mục; bảng workload không phân trang trong bản nhóm này.
- Cập nhật bằng polling mỗi 30 giây sau request trước, không phải WebSocket. Có tắt tự cập nhật, tải thủ công và thời điểm dữ liệu.
- Khi lỗi, giữ dữ liệu cũ kèm cảnh báo và timestamp, không tự thay bằng mock.

### Feedback

- Customer local phải active, có role CUSTOMER active.
- Chỉ booking của customer đó và CHECKED_OUT, chưa có feedback mới xuất hiện trong form.
- Rating nguyên 1–5, comment/reply 5–2000 ký tự sau trim; mỗi booking chỉ một feedback (unique DB).
- Manager/Admin xem và phản hồi theo phạm vi khách sạn, ghi replied_by/replied_at ở backend.
- Phản hồi đã có không bị ghi đè; hai yêu cầu đồng thời trả 409 cho thao tác tới sau.
- Booking CHECKED_OUT trong seed đã được đánh giá/phản hồi sẵn. Nếu form không có booking, đây là kết quả đúng.
  Muốn thử gửi mới cần booking thật của customer local đã hoàn tất trả phòng và chưa đánh giá. Module E không tự tạo/sửa booking để vượt điều kiện.

## API mới trong bước hoàn thiện

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| GET | /api/operations/dashboard?date=2026-11-01&zone=Asia/Bangkok&allTime=true | Dashboard Manager/Admin |
| GET | /api/operations/feedback-customer-context | Customer local đang cấu hình |
| GET | /api/operations/feedback-bookings | Booking đủ điều kiện của customer |
| GET | /api/operations/my-feedback?page=0&size=5 | Đánh giá của customer |
| GET | /api/operations/feedback?page=0&size=5&rating=0&status= | Manager lọc đánh giá |
| POST | /api/operations/feedback | bookingId, rating, comment; trả 201/id |
| PATCH | /api/operations/feedback/{id}/reply | reply; trả id |

Page từ 0, size 1–100. rating=0 nghĩa là tất cả; status rỗng/PENDING/REPLIED.
Các API task/sự cố và mã lỗi xem các phần tương ứng trong README.
400 dữ liệu sai, 403 ngoài phạm vi, 404 không có bản ghi, 409 xung đột/đã có, 503 danh tính local chưa hợp lệ.
Không tự retry request ghi; nếu mất kết nối, kiểm tra danh sách trước khi gửi lại để tránh tạo trùng.

## Kiểm thử và giới hạn xác minh

Đã chạy:
- 70 unit test backend Module E (bao gồm 20 test dashboard/feedback mới).
- npm run build và npm run lint toàn frontend; Maven package tạo executable JAR thành công (unit test chạy riêng trước đó).
- Validation frontend feedback và chuyển giờ Bangkok → UTC của form task.
- SQL Server thật: truy vấn dashboard và feedback; ngày có seed trả 2 task PENDING, workload Housekeeper Demo = 2.
- SQL task/sự cố từ mã nguồn trong transaction rồi ROLLBACK: tạo/giao/nhận/hoàn thành, Unicode, timestamps, chặn cập nhật trùng.
  Không giữ dòng thử, nhưng dãy ID SQL Server có thể tăng sau rollback.
- Feedback ghi mới/đồng thời kiểm tra bằng unit tests; không dùng mất lượt đánh giá booking seed trên DB thật.

Chưa xác minh toàn bộ giao diện/end-to-end HTTP của bản mới sau khi người dùng restart backend.
JWT/production security chủ động nằm ngoài phạm vi bàn giao này; không mô tả đây là bản triển khai production.

Chạy unit test không cần DB:

```powershell
.\mvnw.cmd -Dtest=HousekeepingDashboardServiceTests,FeedbackServiceTests,TaskManagementServiceTests,MyTaskServiceTests,IssueProgressServiceTests,IssueAssignmentServiceTests,IssueReportServiceTests test
```

Sau khi khởi động backend bản mới, từ thư mục backend chạy smoke test chỉ đọc:

```powershell
.\scripts\Test-ModuleE.ps1
```

Chỉ trên database demo dùng để thử, có thể thêm `-WriteDemoData` để tạo task/sự cố gắn nhãn SMOKE-E và chạy trọn luồng.
Các bản ghi SMOKE-E được GIỮ LẠI để kiểm tra, không tự xóa. Script không tạo feedback hay thay booking/auth/inventory.
Không chạy chế độ ghi nếu không muốn thêm dữ liệu thử.

## Checklist demo bằng giao diện

1. Manager tạo/giao task → Staff bắt đầu/hoàn thành → Manager tải lại thấy COMPLETED.
2. Dashboard mặc định Tất cả thời gian khớp dữ liệu bảng; chuyển Theo ngày để kiểm tra riêng ngày lịch task; tự cập nhật sau khoảng 30 giây.
3. Tạo sự cố → Manager phân công → Staff nhận và hoàn tất → Chi tiết có ghi chú/thời gian.
4. Customer mở Feedback: thấy feedback của mình, không thấy booking chưa trả phòng hoặc đã review trong dropdown.
5. Với booking đủ điều kiện: gửi review → Manager thấy, lọc theo sao/chưa phản hồi → trả lời → Customer tải lại thấy phản hồi.
6. Thử sai nhân viên/khách sạn, ghi chú trắng, đánh giá trùng, request hai cửa sổ đồng thời và tắt backend.
7. Reload trang: dữ liệu vẫn lấy từ database, không bị mất như mock cũ.

Thay đổi bước hoàn thiện chưa commit/push. Chờ người dùng kiểm tra và duyệt trước khi đẩy DucHM.

Cập nhật giao diện: lược bỏ các banner kỹ thuật ở trạng thái hoạt động bình thường; vẫn hiển thị người thực hiện và nhãn Chế độ kiểm thử. Danh tính và cơ chế lưu database không thay đổi. Sự cố hiển thị nhân viên được giao và nhắc chờ nhận xử lý.
