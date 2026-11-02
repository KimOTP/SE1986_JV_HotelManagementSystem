# Module E: đăng nhập JWT và kiểm thử SQL Server

Module E lấy người thao tác từ JWT do Module A xác minh. Không dùng profile local-demo và không đọc OPERATIONS_DEMO_* nữa. Tên Demo còn trong giao diện là full_name của bản ghi seed trong SQL Server.

## 1. Khởi động

- Backend IntelliJ: bỏ local-demo trong Active profiles, giữ DB_USERNAME/DB_PASSWORD đang kết nối được, chạy lại ứng dụng.
- Frontend: tạo/cập nhật SE1986_JV_HMS_fe/.env.local, thêm dòng dưới. File này được Git bỏ qua. Đã cấu hình trên máy hiện tại.

~~~properties
VITE_AUTH_DATA_SOURCE=api
~~~

Dừng Vite cũ rồi chạy npm run dev trong thư mục frontend. Mở http://localhost:5173. Đăng xuất phiên mock cũ rồi đăng nhập lại. Không dùng tài khoản @hotel.com của mock.

Nếu chưa đặt mật khẩu cho seed: xem và chạy SE1986_JV_HMS_be/scripts/dev-reset-passwords.sql trong SSMS với database local HotelManagement_SBA. Script của Kiên đổi password_hash BCrypt của các user @sba.example thành mật khẩu 123456 và thu hồi refresh token cũ. Chỉ chạy khi bạn muốn đặt lại mật khẩu các tài khoản seed local; không cần chạy lại mỗi lần test. Agent chưa chạy script này.

| Vai trò | Email seed | Mật khẩu sau khi chạy script |
| --- | --- | --- |
| Manager | manager@sba.example | 123456 |
| Staff | housekeeper@sba.example | 123456 |
| Customer | customer@sba.example | 123456 |
| Lễ tân (STAFF) | reception@sba.example | 123456 |

Dùng một tab: đăng xuất trước khi đổi tài khoản. Hai tab thường cùng origin dùng chung localStorage; nếu cần song song hãy dùng cửa sổ riêng tư hoặc profile trình duyệt khác.

## 2. Công việc: Manager → Staff → Manager

1. Manager: vào Bảng công việc, bấm Tạo và giao việc, chọn phòng của khách sạn, chọn Housekeeper Demo, nhập tiêu đề dễ nhận ra và lịch hôm nay, lưu. Ghi lại ID; trạng thái PENDING.
2. Đăng xuất, đăng nhập housekeeper@sba.example: vào Công việc của tôi, thấy đúng việc vừa giao. Bắt đầu → IN_PROGRESS; Hoàn thành → COMPLETED. Chi tiết có thời gian bắt đầu/hoàn thành.
3. Reload vẫn còn dữ liệu. Manager đăng nhập lại: thấy việc COMPLETED; Tổng quan vận hành mặc định tất cả thời gian. Nếu chọn Theo ngày, chọn đúng ngày lịch công việc.
4. Đăng nhập reception@sba.example: không thấy công việc chỉ giao cho housekeeper; nhân viên khác không được cập nhật qua API.

## 3. Sự cố: Staff báo → Manager giao → Staff xử lý

1. Housekeeper hoặc reception: Báo cáo sự cố, chọn phòng, loại, tiêu đề, mô tả, gửi. Backend tự ghi reported_by từ tài khoản hiện tại, không nhận reporter ID từ trình duyệt.
2. Manager: Quản lý sự cố, tìm tiêu đề vừa tạo, Phân công cho Housekeeper Demo. OPEN → ASSIGNED.
3. Housekeeper đăng nhập: nhận xử lý → IN_PROGRESS; hoàn tất với ghi chú 5–2000 ký tự → RESOLVED.
4. Chi tiết có đúng người báo cáo, người được giao, ghi chú và thời gian. Reload vẫn còn. Manager không thay staff nhận việc/hoàn tất.
5. Staff thấy sự cố được giao hoặc tự báo trong khách sạn của mình. Manager thấy sự cố trong khách sạn quản lý; ADMIN xem khách sạn hoạt động.

## 4. Đánh giá

1. Customer: Đánh giá & phản hồi, chỉ thấy đánh giá của chính mình.
2. Gửi đánh giá chỉ khi booking của mình CHECKED_OUT và chưa được đánh giá. Seed hiện có booking đã được đánh giá nên dropdown trống có thể là đúng. Không sửa Booking để ép điều kiện; dùng một booking hợp lệ qua luồng của nhóm.
3. Customer báo sự cố chỉ với phòng thuộc booking CHECKED_IN của mình; không có phòng đang lưu trú thì dropdown phòng trống là đúng.
4. Manager: xem đánh giá trong khách sạn quản lý, trả lời đánh giá chưa có phản hồi. Customer tải lại thấy phản hồi. Không ghi đè phản hồi cũ.

## 5. Xác nhận JWT và kiểm tra SQL

DevTools → Network: POST /api/auth/login trả accessToken; các request /api/operations/... có Authorization: Bearer ... . Không chia sẻ token qua ảnh/log. Không token, token giả/hết hạn: 401; thiếu quyền: 403. Access token hết hạn có cơ chế refresh của Module A.

Trong SSMS, truy vấn đọc dưới đây để đối chiếu sau khi thao tác:

~~~sql
SELECT TOP (10) t.task_id, t.title, t.status, au.email AS assigned_by,
       su.email AS assigned_to, t.started_at, t.completed_at
FROM operations.tasks t
JOIN identity_access.users au ON au.user_id = t.assigned_by
JOIN identity_access.staff s ON s.staff_id = t.assigned_staff_id
JOIN identity_access.users su ON su.user_id = s.user_id
ORDER BY t.task_id DESC;

SELECT TOP (10) i.issue_id, i.title, i.status, u.email AS reported_by,
       i.assigned_staff_id, i.resolution_note, i.resolved_at
FROM operations.issues i
JOIN identity_access.users u ON u.user_id = i.reported_by
ORDER BY i.issue_id DESC;
~~~

## 6. Script kiểm thử tùy chọn

Từ thư mục backend, chạy PowerShell:

~~~powershell
.\scripts\Test-ModuleE.ps1
~~~

Script hỏi mật khẩu (không hiện ký tự), đăng nhập từng vai trò bằng backend, đọc API và đối chiếu tổng dashboard; login có thể tạo bản ghi refresh token. Không tự reset mật khẩu. Mặc định không ghi dữ liệu nghiệp vụ.

Thêm -WriteDemoData chỉ khi muốn tạo một task và một issue kiểm thử có tiền tố SMOKE-E; các bản ghi này được giữ lại để đối chiếu. Script đổi JWT giữa Manager/Staff cho từng bước. Không tạo feedback hay sửa Booking/Inventory.

## 7. Kiểm tra tự động

~~~powershell
.\mvnw.cmd '-Dtest=*ServiceTests,OperationsJwtSecurityTests' test
~~~

Kiểm tra SQL/Unicode/trạng thái và quyền JWT bằng unit test + HTTP MockMvc với chữ ký thật. Không thay thế chạy toàn bộ luồng trên database của bạn.

## Kiểm thử feedback độc lập với các module khác

Đã bổ sung bộ kiểm thử API/service/SQL Server dùng database riêng và rollback fixtures. Xem [hướng dẫn kiểm thử tích hợp feedback](module-e-feedback-integration.md).
