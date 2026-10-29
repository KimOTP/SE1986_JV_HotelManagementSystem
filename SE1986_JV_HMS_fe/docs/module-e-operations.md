# Module E — Hoàng Minh Đức

## Bước 1: Báo cáo sự cố (UC-E4)

- Form dùng React Hook Form và Zod: trim dữ liệu, bắt buộc số phòng, danh mục hợp lệ, mô tả 5–2000 ký tự.
- Báo cáo mới xuất hiện đầu bảng `/operations/issues`, trạng thái `OPEN`.
- Lưu demo qua localStorage (`se1986.moduleE.issues.v1`), giữ dữ liệu khi tải lại trang.
- Thao tác đánh dấu đã xử lý trên bảng cũng được lưu; lỗi đọc/ghi được hiển thị, không báo thành công khi ghi thất bại.
- Chưa có backend trong repo. Dữ liệu demo dùng chung trong một trình duyệt, không có phân tách tài khoản hoặc đồng bộ giữa thiết bị. Không dùng dữ liệu cá nhân thật để demo.

## Kiểm tra thủ công

1. Đăng nhập tài khoản có quyền xem Operations, mở `/operations/report-issue`.
2. Thử số phòng chỉ chứa khoảng trắng hoặc mô tả dưới 5 ký tự: phải báo lỗi.
3. Nhập số phòng, chọn danh mục, nhập mô tả hợp lệ và gửi.
4. Bấm “Xem danh sách sự cố”: báo cáo vừa tạo xuất hiện; tải lại vẫn còn.
5. Với Manager/Admin, đánh dấu đã xử lý rồi tải lại: trạng thái vẫn là `RESOLVED`.
6. Khi localStorage bị chặn hoặc dữ liệu lưu hỏng, màn hình báo lỗi thay vì báo lưu thành công. Xóa riêng khóa demo trên để khởi tạo lại dữ liệu mẫu nếu cần.

## Đối chiếu database và bước tiếp theo

Đã đối chiếu `01_schema.sql` và `02_seed_demo.sql` được cung cấp. Không sửa schema ở bước này.

| Frontend demo | Database đích / việc cần làm khi tích hợp                                   |
| ------------- | --------------------------------------------------------------------------- |
| `roomNumber`  | Tra cứu `inventory.rooms.room_id`; backend kiểm tra phòng và quyền truy cập |
| `category`    | Tra cứu `operations.issue_types.issue_type_id`; lấy danh mục thật từ API    |
| `description` | `operations.issues.description`, tối đa 2000 ký tự                          |
| `reportedBy`  | Hiện chỉ tên hiển thị; backend lấy `reported_by` từ người dùng xác thực     |
| `status`      | Backend quản lý `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`     |

Commit sau cần bổ sung `title` (bắt buộc, 200 ký tự), priority, chọn phòng/danh mục từ API và DTO dùng ID trước khi gửi sang backend. Không gửi trực tiếp payload demo vào bảng SQL.

UC-E1/E2/E3/E5/E6 vẫn cần hoàn thiện nghiệp vụ, phân quyền theo từng use case và API. Khi có backend Spring/JPA, dùng join fetch cho quan hệ cần hiển thị để tránh N+1; hiện repo chưa có JPA để áp dụng.
