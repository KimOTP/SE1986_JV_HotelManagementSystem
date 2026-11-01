# Kết quả kiểm thử Module E — 01/11/2026

Phạm vi: Module E dùng JWT và SQL Server HotelManagement_SBA. Không sửa mã Booking/Front Desk/Inventory, không đổi trạng thái booking.

## Đã chạy và đạt

- 80 bài kiểm thử backend: service nghiệp vụ, trạng thái, phạm vi khách sạn/assignee/customer, Unicode và MockMvc với JWT ký thật (token giả/hết hạn/tài khoản bị khóa bị từ chối).
- Frontend: npm run lint và npm run build đạt. Có cảnh báo bundle lớn hơn 500 kB; không chặn build.
- Đăng nhập API thật thành công với manager@sba.example, housekeeper@sba.example, customer@sba.example.
- Script Test-ModuleE.ps1 ở chế độ chỉ đọc nghiệp vụ: dashboard đối chiếu tổng trạng thái, danh sách task/sự cố/feedback và dữ liệu customer/staff đều đạt.
- 13 kiểm tra HTTP thật: anonymous đọc issues 401; customer đọc tasks 403; staff đọc dashboard 403; manager cập nhật my-tasks 403; staff gửi feedback 403; rating 0 trả 400; booking chưa checkout trả 409; feedback trùng booking trả 409; ghi đè phản hồi trả 409; staff phản hồi trả 403; manager đọc feedback/customer đọc my-feedback/staff đọc my-tasks trả 200.
- SQL Server ghi trực tiếp trong giao dịch rollback: tạo/bắt đầu/hoàn thành task; tạo/phân công/nhận/giải quyết sự cố; Unicode, timestamps và conditional updates đều đạt.
- SQL Server feedback trong giao dịch rollback: tạm thay feedback của booking đã checkout, thử insert và phản hồi, kiểm tra Unicode/manager/time/chặn ghi đè rồi rollback. Kiểm tra checksum xác nhận feedback gốc được khôi phục. Không thay đổi Booking. IDENTITY có thể tăng dù rollback.

## Lỗi nhỏ đã sửa

PowerShell có thể giữ một JSON array rỗng như một phần tử khi đếm kết quả. Read-Api trong Test-ModuleE.ps1 đã enumerate kết quả rõ ràng. Chạy lại: Eligible feedback bookings: 0 (đúng với API và SQL).

## Chưa xác nhận toàn bộ luồng từ giao diện

Chưa chạy gửi feedback mới thành công qua UI → API → SQL trong cùng một luồng vì chưa có booking của customer đã CHECKED_OUT mà chưa có feedback. Các kiểm tra insert SQL, service và API từ chối không thay thế kiểm tra này.

Dữ liệu tại thời điểm kiểm tra: BK-DEMO-001 CONFIRMED/chưa feedback; BK-DEMO-002 CHECKED_OUT/đã feedback; BK-DEMO-003 PENDING/chưa feedback. Front Desk FE vẫn dùng mock nên thao tác check-in ở màn đó chưa cập nhật các booking SQL này.

## Việc tiếp theo

1. Ưu tiên tạo fixture booking CHECKED_OUT/chưa feedback trong database thử nghiệm riêng hoặc sử dụng luồng Booking/Front Desk thật sau khi nhóm nối API. Không đổi điều kiện nghiệp vụ feedback để bỏ qua checkout hoặc cho đánh giá trùng.
2. Chạy UI Customer gửi đánh giá → Manager phản hồi → Customer reload; xác nhận lại dữ liệu SQL và thử gửi lại bị chặn.
3. Kiểm thử nhiều tài khoản/khách sạn trong database test để xác nhận cách ly end-to-end (hiện đã có unit/security tests).
4. Sau tích hợp các module, chạy một vòng từ đặt phòng đến checkout và feedback trước khi xác nhận bản final.

Không tự push bản sửa script hoặc báo cáo này.
