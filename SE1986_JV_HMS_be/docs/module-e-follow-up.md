# Module E: bổ sung nghiệp vụ vận hành

Áp dụng cho một khách sạn. Đăng nhập JWT; MANAGER quản lý, HOUSEKEEPER thực hiện. ADMIN chỉ dùng nếu được cấp UC tương ứng.

## Cập nhật local
Chạy scripts/migrate-module-e-follow-up.sql trên HotelManagement_SBA, sau đó khởi động lại backend. Script chỉ thêm bảng operations.work_history, không sửa dữ liệu phòng, booking, thanh toán hoặc tài khoản.

## Luồng mới
- Bảng công việc: Giao lại / Hủy cho PENDING hoặc IN_PROGRESS, nhập lý do 5–1000 ký tự. Không mở lại COMPLETED/CANCELLED.
- Giao lại giữ trạng thái và timestamps gốc. Nhân viên mới tiếp tục việc đang làm; lịch sử ghi người cũ, người mới, manager và lý do.
- Quản lý sự cố: Giao lại cho ASSIGNED/IN_PROGRESS. Không hủy hoặc mở lại RESOLVED/CLOSED.
- Mỗi thay đổi so sánh row_version, cập nhật và lịch sử trong cùng transaction. Dữ liệu cũ trả 409 và yêu cầu mở lại form.
- Yêu cầu hỗ trợ của tôi (UC-E4): người gửi xem báo cáo của chính mình, kể cả sau checkout. Không mở quyền quản lý nội bộ cho CUSTOMER/RECEPTIONIST.
- Dashboard: sự cố tồn đọng không bị loại khi chọn ngày khác; thống kê task vẫn theo bộ lọc ngày hiện có.

## Giới hạn phối hợp
Không cập nhật inventory.rooms thành CLEAN, không tự tạo việc từ checkout, không đồng bộ task bảo trì với issue. Các thay đổi này cần thống nhất với module phòng/lễ tân.
Không thay đổi dữ liệu lịch sử task gốc; chưa có lịch sử theo từng phút làm của mỗi nhân viên.
