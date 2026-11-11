# Module E — chỉnh cách trình bày và kiểm tra ngày 11/11/2026

## Phạm vi thay đổi

- Chuẩn hóa định dạng Java trong package `com.hotel.hms.operations`: thụt dòng 4 khoảng trắng, sắp xếp import, tách phương thức và câu lệnh.
- Căn lại các SQL text block cùng mức thụt dòng với Java; giữ nguyên nội dung truy vấn sau khi Java xử lý thụt dòng.
- Đổi tên helper riêng trong `OperationsFollowUpService`: `loadWork`, `tableName`, `idColumn`, `requireMutable`, `recordHistory`.
- Làm rõ tên biến như `nextStaffId`, `eligibleStaffCount`, `linkedWork`, `expectedIssueStatus`.
- Bổ sung chú thích về thứ tự khóa, kiểm tra phiên bản, đồng bộ task–sự cố và chống đánh giá trùng.
- Sửa chú thích cũ trong `MyTaskService` để mô tả đúng việc rollback nếu cập nhật bản ghi liên kết không thành công.

Không chuyển JDBC sang JPA, thay đổi API, cấu trúc database, quyền truy cập hay quy tắc chuyển trạng thái. Giữ nguyên cấu hình database local đang có.

## Thứ tự đọc code khi review

1. `controller/IssueReportController.java` → `service/IssueReportService.java`: danh tính người báo cáo, phòng được phép báo cáo, tạo sự cố OPEN.
2. `service/IssueAssignmentService.java`, hàm `assign`: phân công và tạo task liên kết trong cùng transaction.
3. `service/OperationsFollowUpService.java`, hàm `change`: kiểm tra quyền, trạng thái, phiên bản; giao lại và ghi lịch sử.
4. `service/LinkedWorkGuard.java`: khóa sự cố trước task, kiểm tra phòng, người xử lý và trạng thái liên kết.
5. `service/MyTaskService.java`, hàm `start` và `complete`: cập nhật tiến độ và sự cố liên kết.
6. `service/TaskManagementService.java`: tạo và tra cứu công việc độc lập.
7. `service/FeedbackService.java`: booking đủ điều kiện, gửi đánh giá, phản hồi.
8. `service/HousekeepingDashboardService.java`: thống kê theo trạng thái, thời gian và phạm vi quản lý.

## Kết quả kiểm tra

- Backend: `clean test` bằng Java 21; tổng 298 kiểm tra, 279 đạt, 19 bỏ qua, không failure/error.
- Module E: 127 kiểm tra đạt, không bỏ qua; bao gồm kiểm tra JWT, dịch vụ và SQL Server trên database test riêng. Các fixture SQL tích hợp được rollback.
- 19 kiểm tra chưa chạy thuộc module phòng: `InventorySqlServerTests` (18) và `InventoryJpaSchemaTests` (1), cần cấu hình riêng.
- Frontend: build và ESLint đạt; 16 kiểm tra Node đạt.
- Đối chiếu 53 file Java với bản trước chỉnh: không phát hiện thay đổi token/nội dung chuỗi ngoài format, import, chú thích, dấu ngoặc khối điều kiện và tên helper/biến đã nêu.

## Kiểm tra trình duyệt sau chỉnh

- Đăng nhập Manager, Housekeeper Test B và Customer thành công.
- Dashboard Manager tải được dữ liệu.
- Tạo sự cố test #6, phòng 101, tiêu đề `[TEST-DUCHM] Kiểm tra sau format 11-11`.
- Phân công Test A, sau đó giao lại Test B khi chưa bắt đầu; sinh task liên kết #7.
- Test B thấy task và bắt đầu xử lý; Manager thấy sự cố IN_PROGRESS và không có nút giao lại.
- Test B hoàn thành task; sự cố RESOLVED, người xử lý vẫn là Test B, thời gian hoàn thành và lịch sử giao lại hiển thị đầy đủ.
- Manager xem được đánh giá và mở form phản hồi; không gửi phản hồi thử vào đánh giá sẵn có.
- Customer thấy sidebar và danh sách đánh giá của mình; không còn booking đủ điều kiện nên nút gửi đánh giá bị khóa.

## Giới hạn

Đây là kiểm tra hồi quy sau chỉnh cách trình bày Module E, không phải xác nhận mọi tình huống của toàn HMS. Không thực hiện giao dịch payOS thật. Tạo/phản hồi feedback được kiểm tra bằng API và SQL Server tích hợp; lần kiểm tra trình duyệt này không gửi feedback mới vì tài khoản demo không còn booking đủ điều kiện.

Code chưa được commit hoặc push trong lần chỉnh này.
