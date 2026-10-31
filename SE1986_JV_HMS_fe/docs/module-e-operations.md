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

## Bước 2: Đọc danh mục từ SQL Server

- Form gọi `GET /api/operations/issue-types`, chọn theo ID và hiển thị tên từ database.
- Có trạng thái tải, danh mục rỗng, lỗi và Thử lại; không tự thay bằng mock khi lỗi.
- Báo cáo vẫn lưu localStorage kèm `issueTypeId` và tên, chưa gửi vào SQL Server.
- Bộ lọc bảng hỗ trợ danh mục của báo cáo cũ và mới.
- Chạy backend ở cổng 8080 và frontend bằng `npm run dev`. Khởi động lại Vite để nhận proxy `/api` mới.
- Có thể đặt `VITE_OPERATIONS_API_BASE_URL` để đổi URL. Gọi khác origin cần CORS ở backend. Production cần reverse proxy `/api` hoặc URL API riêng; Vite proxy chỉ dùng khi phát triển.
- Kiểm tra: mở form, thấy Điện/Nước/Thiết bị/Vệ sinh; gửi demo và lọc theo danh mục trên bảng; tải lại vẫn còn dữ liệu. Tắt backend, mở lại form để kiểm tra lỗi; bật backend và bấm Thử lại.

Commit gợi ý: `feat(operations): load issue types from backend in report form`

## Bước 4: Bảng sự cố dùng database

- `/operations/issues` gọi API thật, 5 bản ghi/trang; không đọc hoặc cập nhật localStorage.
- Bộ lọc `room`, `status`, `category` được gửi tới backend, áp dụng trước phân trang.
- Room là tìm chứa chuỗi; status và category là so khớp chính xác. Đổi bộ lọc quay về trang đầu.
- Hiển thị đủ năm trạng thái SQL và chi tiết tiêu đề, ưu tiên, người báo cáo, người được gán.
- Có tải lại, lỗi, trang rỗng và hủy request cũ khi đổi trang hoặc rời màn hình.
- API chưa trả tổng số bản ghi nên dùng Trước/Sau. Nếu trang cuối có đúng 5 bản ghi, có thể mở thêm một trang rỗng rồi quay lại.
- Bảng hiện chỉ đọc; cập nhật trạng thái sẽ được thêm khi có API ghi. Form báo cáo vẫn lưu demo và đã ghi rõ báo cáo đó chưa xuất hiện trên bảng database.

### Kiểm tra thủ công

1. Khởi động lại backend để nhận bộ lọc mới, chạy frontend và đăng nhập tài khoản có quyền Operations.
2. Mở `/operations/issues`: với seed ban đầu thấy phòng 103, danh mục Thiết bị, trạng thái Đã phân công.
3. Lọc phòng 103 + ASSIGNED: vẫn có bản ghi. Lọc OPEN: không có bản ghi nếu database chỉ có seed ban đầu.
4. Bấm Đặt lại và Chi tiết, kiểm tra tiêu đề và tên người liên quan.
5. Tắt backend, bấm Tải lại: phải báo lỗi, không hiển thị dữ liệu mock. Bật backend và Thử lại.
6. Bộ lọc mới kiểm tra trực tiếp bằng `/api/operations/issues?room=103&status=ASSIGNED`.

Commit gợi ý: `feat(operations): display database issues with server-side filters`

## Bước 5: Tạo báo cáo vào SQL Server (local-demo)

Đã đồng bộ main mới nhất, giữ shared axiosClient và phân quyền route của Module A.
Form chọn phòng/danh mục API, thêm title/priority, validate React Hook Form + Zod và POST `/operations/issues`.
Không còn lưu localStorage; thành công chỉ hiển thị sau HTTP 201 và có link tới bảng database.

Backend chưa có JWT thật. Tính năng ghi mặc định tắt. Để thử local xem README backend:
Active profiles = `local-demo`, thêm biến `OPERATIONS_DEMO_REPORTER_EMAIL=reception@sba.example` rồi khởi động lại.
Reporter do backend cấu hình từ tài khoản database hoạt động và hiển thị rõ trên form;
chưa phải tài khoản React đang đăng nhập. Không triển khai chia sẻ chế độ này.
Khi có JWT cần tích hợp principal và quyền ở backend trước khi mở ghi thực tế.

Kiểm tra gửi form hợp lệ: bảng phải xuất hiện sự cố OPEN mới và giữ lại sau tải trang.
Báo cáo localStorage cũ không tự migrate vào database.

Commit: `feat(operations): create database issue reports in explicit local demo mode`
