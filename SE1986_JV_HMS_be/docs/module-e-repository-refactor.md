# Module E: tách Controller → Service → Repository

## Phạm vi

Chỉ thay đổi package `com.hotel.hms.operations` và các bài kiểm tra Module E. Không sửa code Module A, B, C, D, frontend, API, entity hoặc cấu trúc database. Cấu hình `application.properties` local đã được chỉnh từ trước và được giữ nguyên.

Module B được tham khảo về cách phân lớp: controller nhận request, service kiểm tra nghiệp vụ và quản lý transaction, repository thực hiện truy cập dữ liệu. Đây là refactor phân lớp; không chuyển toàn bộ JDBC sang JPA. Hai repository JPA hiện có của Module E vẫn được giữ, các SQL/khóa đặc thù SQL Server được chuyển nguyên nội dung xuống các repository riêng.

## Trách nhiệm sau refactor

| Tầng | Trách nhiệm |
| --- | --- |
| Controller | Nhận request, validation, kiểm tra quyền API, gọi service và trả response. |
| Service | Lấy danh tính, kiểm tra phạm vi và trạng thái, điều phối cập nhật, giữ `@Transactional`, chuyển lỗi nghiệp vụ thành phản hồi phù hợp. |
| Repository | Chạy truy vấn, bind tham số, ánh xạ kết quả, lấy generated ID và khóa bản ghi. Không phụ thuộc ngược vào service. |

Không còn `JdbcTemplate`, `ResultSet`, `PreparedStatement`, `GeneratedKeyHolder` hay SQL thực thi trực tiếp trong service của Module E.

## Các cặp service–repository để review

| Service | Repository | Chức năng |
| --- | --- | --- |
| `IssueReportService` | `IssueReportRepository` | Reporter, phòng được báo cáo, danh mục và tạo sự cố. |
| `IssueAssignmentService` | `IssueAssignmentRepository` | Manager, phạm vi khách sạn, nhân viên hợp lệ, phân công và tạo task liên kết. |
| `IssueProgressService` | `IssueProgressRepository` | Nhân viên thực hiện, bắt đầu/giải quyết sự cố và đồng bộ task. |
| `MyTaskService` | `MyTaskRepository` | Danh sách của nhân viên, bắt đầu/hoàn thành task và đồng bộ sự cố. |
| `TaskManagementService` | `TaskManagementRepository` | Tạo và tra cứu công việc độc lập. |
| `OperationsFollowUpService` | `OperationsFollowUpRepository` | Đọc phiên bản, giao lại/hủy hợp lệ, ghi/đọc lịch sử và yêu cầu của tôi. |
| `FeedbackService` | `FeedbackRepository` | Booking đủ điều kiện, đánh giá của khách, tạo và phản hồi đánh giá. |
| `HousekeepingDashboardService` | `HousekeepingDashboardRepository` | Thống kê, khối lượng, việc khẩn và sự cố tồn đọng. |
| `IssueService` | `IssueQueryRepository` + `IssueRepository` | Lọc ID theo quyền/phân trang trước, sau đó dùng JPQL lấy quan hệ. |

`LinkedWorkGuard` giữ quy tắc nhất quán và quyền xử lý; `LinkedWorkRepository` thực hiện truy vấn khóa. Các record kết quả truy vấn được chuyển từ service sang repository để tầng dữ liệu không import service. JSON trả cho frontend giữ nguyên các thuộc tính.

## Ví dụ luồng phân công và tiến độ

1. Controller kiểm tra quyền và gọi `IssueAssignmentService.assign()`.
2. Service kiểm tra Manager, phạm vi, trạng thái OPEN và nhân viên nhận việc.
3. Repository cập nhật có điều kiện và tạo task liên kết. Cả hai vẫn thuộc transaction của service.
4. Khi giao lại hoặc bắt đầu: `LinkedWorkGuard` gọi `LinkedWorkRepository` khóa sự cố trước, task sau.
5. Service kiểm tra lại người được giao, trạng thái và phiên bản. Repository chỉ thực hiện câu cập nhật có điều kiện.
6. Cập nhật task, sự cố và lịch sử liên quan vẫn cùng transaction. Nếu một bước không cập nhật đúng số dòng, service ném lỗi để rollback.

## Kiểm tra sau refactor — 11/11/2026

- Backend: biên dịch sạch và 296 bài kiểm tra đạt, không lỗi, không bỏ qua.
- Module E: 130 bài đạt, bao gồm 3 bài mới kiểm tra ranh giới controller/service/repository.
- Các kiểm tra tích hợp feedback, giao lại và task–sự cố chạy trên database Module E riêng, có rollback fixture.
- Module B: kiểm tra SQL Server riêng và xác minh schema local chỉ đọc đều chạy trong lượt đầy đủ.
- Frontend: build, ESLint và 16 bài kiểm tra đều đạt; không sửa frontend.
- Đối chiếu 302 lần xuất hiện chuỗi SQL/thông báo và các chuỗi liên quan trước/sau: nội dung không đổi, chỉ chuyển vị trí và định dạng.
- API local: Manager tạo task → Housekeeper bắt đầu → hoàn thành → Manager đọc lại: đạt.
- API local: tạo sự cố → phân công → bắt đầu → giải quyết, lưu ghi chú/thời gian và cập nhật dashboard: đạt.
- Dữ liệu kiểm tra có nhãn `SMOKE-E-20261111035335-3992`: task độc lập #10, sự cố #8 cùng task liên kết. Được giữ để tra cứu.
- API đọc liên module: `/auth/me`, danh mục phòng công khai, danh sách booking của khách/quản lý, check-in/check-out và hóa đơn đều thành công.
- Kiểm tra quyền: Customer bị từ chối truy cập công việc quản lý (403); anonymous bị từ chối danh sách sự cố (401).
- Trình duyệt: Manager đăng nhập, dashboard, chi tiết sự cố vừa xử lý, màn hình check-in, danh sách đánh giá; Customer đăng nhập và thấy đánh giá của mình.

## Giới hạn

Không thực hiện giao dịch payOS thật, gửi OTP/email hoặc quyết toán/check-out trên dữ liệu demo của nhóm. Vì vậy kết quả trên là kiểm tra hồi quy và tích hợp, không khẳng định mọi kịch bản thực tế của toàn HMS đã được thử. Các bài kiểm tra giao lại/bắt đầu hiện có xác nhận các thứ tự nghiệp vụ; chưa bổ sung bài hai transaction chạy đồng thời thực sự trong lần refactor này.

## Lượt xác nhận trước khi push DucHM

- Chạy lại toàn bộ: 296 bài backend đạt, không lỗi hoặc bỏ qua; 130 bài thuộc Module E. Frontend build, ESLint và 16 bài kiểm tra đều đạt.
- API thực: tạo công việc, bắt đầu, hoàn thành, tạo/phân công/giải quyết sự cố và đối chiếu dashboard đều đạt.
- Thử hai HTTP request giao lại và bắt đầu được gửi trước khi chờ kết quả: Housekeeper bắt đầu trả 200, Manager giao lại trả 409; người phụ trách không bị ghi đè. Sau khi hoàn thành, sự cố #11 là RESOLVED và task #15 là COMPLETED. Đây là một lượt thử gửi gần đồng thời, không phải kiểm thử tải hoặc bảo đảm bao phủ mọi lịch chạy.
- Tìm phòng ngày 18–20/02/2030 → tạo booking PENDING → đọc booking của chính khách → hủy booking: đạt. Số phòng trống giảm khi giữ chỗ và khôi phục sau hủy. Booking test `BK-AD3E4751F62442C88547E2C4` được giữ ở CANCELLED; không tạo link hay thu tiền.
- API đọc tài khoản, danh mục phòng, booking, check-in, check-out và hóa đơn đều thành công. Customer bị chặn công việc quản lý (403), anonymous bị chặn danh sách sự cố (401).
- Không sửa code Module A–D hoặc frontend. Không đưa cấu hình database local và log kiểm tra vào commit. Chỉ đẩy nhánh DucHM; không đẩy main.

Không phát hiện hồi quy trong phạm vi kiểm tra nêu trên. Các giới hạn về thanh toán thật, OTP/email và quyết toán/check-out vẫn áp dụng.
