# Kiểm thử tích hợp Feedback — Module E

## Mục đích và phạm vi

Kiểm thử luồng Customer gửi đánh giá → Manager phản hồi → Customer đọc lại mà không cần chờ Front Desk/Booking UI nối API. Fixtures được tạo trong database riêng, không sửa database dùng chung HotelManagement_SBA hoặc mã nguồn các module khác.

Bộ test dùng MockMvc gọi controller thật, service thật, JDBC thật và SQL Server thật. Token do JwtService ký và JwtAuthenticationFilter xác minh. Riêng bước tìm principal của Module A được stub theo tài khoản fixture; đây không phải kiểm thử mật khẩu đăng nhập hoặc trình duyệt.

## Chuẩn bị một lần

Yêu cầu: Java 21, Maven wrapper của dự án, SQL Server local hỗ trợ SQL Server Authentication, sqlcmd trên PATH. Script setup dùng Windows Authentication với quyền tạo database/login trên instance local.

Từ thư mục backend:

~~~powershell
.\scripts\New-ModuleETestDatabase.ps1
~~~

Script tạo HotelManagement_Feedback_module_e_test bằng bản schema có sẵn, không chạy seed dùng chung. Tạo login riêng với quyền db_owner chỉ trong database test, không cấp server role. Database/login test được giữ lại để chạy nhiều lần.

Script từ chối tên không kết thúc bằng _module_e_test và từ chối database đã tồn tại. Không drop/reset database có sẵn. Thiết lập kết nối được lưu dưới target/module-e-test/connection.json, đã được Git ignore. Không đưa file này lên Git hoặc gửi ảnh nội dung.

## Chạy kiểm thử

~~~powershell
.\scripts\Test-ModuleEFeedbackSql.ps1
~~~

Nếu Maven đã tải đầy đủ dependencies và cần chạy offline:

~~~powershell
.\scripts\Test-ModuleEFeedbackSql.ps1 -Offline
~~~

Chạy kèm 80 test nghiệp vụ/JWT hiện có:

~~~powershell
.\scripts\Test-ModuleEFeedbackSql.ps1 -Offline -IncludeUnitTests
~~~

Script nạp OPERATIONS_TEST_JDBC_URL, OPERATIONS_TEST_USERNAME, OPERATIONS_TEST_PASSWORD trong tiến trình hiện tại và khôi phục giá trị cũ sau khi chạy. Test không đọc DB_USERNAME/DB_PASSWORD và kiểm tra DB_NAME() trước khi tạo fixture; database thực phải kết thúc bằng _module_e_test.

Không cấu hình OPERATIONS_TEST_JDBC_URL thì FeedbackSqlServerTests được skip trong các lần chạy test thông thường; skip không được tính là đã test tích hợp SQL.

## Năm trường hợp tích hợp

1. Customer có booking CHECKED_OUT chưa đánh giá: thấy booking đủ điều kiện, POST trả 201, lưu đúng customer/Unicode; booking biến mất khỏi danh sách được đánh giá. Manager phản hồi; Customer GET đọc lại đúng nội dung; replied_by và replied_at đúng.
2. Customer khác không được gửi đánh giá cho booking này và không xem được đánh giá của chủ booking.
3. Manager khách sạn khác không thấy đánh giá trong danh sách và PATCH phản hồi bị 403, không ghi dữ liệu.
4. Gửi trùng booking trả 409, phản hồi lần hai trả 409, không tạo bản ghi trùng.
5. Booking chưa checkout trả 409; rating không hợp lệ trả 400; không tạo feedback.

Mỗi test chạy trong transaction và rollback sau khi kết thúc, kể cả khi assertion thất bại. IDENTITY trong database test có thể tăng sau rollback. Không có bản ghi fixture được giữ lại cho giao diện thật sử dụng.

## Kết quả 02/11/2026

Đã chạy 5/5 test tích hợp SQL Server thành công; chạy kèm 80 test hiện có được tổng 85/85, không skip. Frontend lint/build sau cập nhật main đều đạt. Đã xác minh bảng users/bookings/feedback trong database test trống sau rollback. Không đổi điều kiện nghiệp vụ, không thay Booking/Front Desk. Main mới nhất f12cd13 (Module B của Linh) đã được cập nhật vào nhánh DucHM trước khi làm.

## Việc còn lại

Kiểm thử trình duyệt thật Customer → Manager → Customer vẫn là bước riêng. Khi nhóm nối Booking/Front Desk API, dùng một booking đã checkout và chưa đánh giá để kiểm tra toàn hệ thống. Có thể dùng database test riêng để chuẩn bị một phiên demo sau, nhưng bộ test rollback này không tạo sẵn tài khoản/booking cho giao diện.
