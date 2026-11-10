# Module E: bổ sung nghiệp vụ vận hành

Áp dụng cho một khách sạn. Đăng nhập JWT; MANAGER quản lý, HOUSEKEEPER thực hiện. ADMIN chỉ dùng nếu được cấp UC tương ứng.

## Cập nhật local
Chạy scripts/migrate-module-e-follow-up.sql trên HotelManagement_SBA, sau đó khởi động lại backend. Script chỉ thêm bảng operations.work_history, không sửa dữ liệu phòng, booking, thanh toán hoặc tài khoản.

## Luồng mới
- Bảng công việc: Giao lại / Hủy chỉ cho PENDING, nhập lý do 5–1000 ký tự. Không mở lại COMPLETED/CANCELLED.
- Không giao lại khi IN_PROGRESS. Nhân viên mới chỉ nhận công việc chưa bắt đầu; lịch sử ghi người cũ, người mới, manager và lý do.
- Quản lý sự cố: Giao lại chỉ cho ASSIGNED. Không hủy hoặc mở lại RESOLVED/CLOSED.
- Mỗi thay đổi so sánh row_version, cập nhật và lịch sử trong cùng transaction. Dữ liệu cũ trả 409 và yêu cầu mở lại form.
- Yêu cầu hỗ trợ của tôi (UC-E4): người gửi xem báo cáo của chính mình, kể cả sau checkout. Không mở quyền quản lý nội bộ cho CUSTOMER/RECEPTIONIST.
- Dashboard: sự cố tồn đọng không bị loại khi chọn ngày khác; thống kê task vẫn theo bộ lọc ngày hiện có.

## Giới hạn phối hợp
Không cập nhật inventory.rooms thành CLEAN và không tự tạo việc từ checkout. Task bảo trì có issue_id được đồng bộ người phụ trách và tiến độ với sự cố tương ứng; task độc lập không tự tạo sự cố.
Không thay đổi dữ liệu lịch sử task gốc; chưa có lịch sử theo từng phút làm của mỗi nhân viên.

## Đồng bộ task–sự cố liên kết
- Giao lại trước khi bắt đầu, từ bất kỳ màn hình nào chuyển người phụ trách cả hai bản ghi và lưu lịch sử ở cả hai, trong cùng transaction.
- Task PENDING tương ứng issue ASSIGNED; IN_PROGRESS tương ứng IN_PROGRESS; COMPLETED tương ứng RESOLVED/CLOSED.
- Mọi thao tác liên kết khóa sự cố trước rồi task. Người cũ không được bắt đầu/hoàn thành sau bàn giao. Dữ liệu lệch sẵn có bị chặn để quản lý kiểm tra, không tự ghi đè.
- Không hủy riêng task gắn sự cố; dùng giao lại hoặc hoàn tất xử lý. Task độc lập vẫn hủy được.
- Dữ liệu thử: scripts/seed-module-e-handover-demo.sql tạo hai tài khoản test và bốn tình huống có nhãn TEST-DUCHM; không reset dữ liệu đã thử khi chạy lại.

Lịch sử thay đổi nằm trong Chi tiết, chỉ đọc ở mọi trạng thái. Không còn nút Lịch sử điều chỉnh riêng trên bảng. Khi nhân viên bắt đầu trước thao tác giao lại, backend từ chối yêu cầu giao lại, kể cả form đã mở sẵn.
