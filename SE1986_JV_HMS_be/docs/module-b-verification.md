# Module B — kết quả kiểm tra ngày 01/11/2026

## Cập nhật tái cấu trúc package

Các lớp production hiện được chia trong rooms.controller, dto, entity, repository,
security và service. InventoryExceptionHandler nằm trong controller,
InventoryWebConfiguration trong security, InventoryMapper trong service.
InventoryService sở hữu logic nghiệp vụ
và transaction; InventoryRepository chỉ phụ trách JDBC/SQL. AvailableRoom là projection
chỉ đọc từ procedure, không thay mapping JPA hoặc schema của module khác.
Danh sách file ở phần báo cáo ban đầu bên dưới là theo tên lớp; vị trí package hiện tại
xem cây thư mục trong module-b-api.md. Các test đã được cập nhật import và dependency service.
Sau tái cấu trúc đã chạy Maven Wrapper `clean test` với `-Dtest=Inventory*Tests`:
BUILD SUCCESS, 40 test gồm 22 đạt và 18 SQL Server integration skip vì chưa có DB test riêng.
Build sạch đã loại class package cũ để tránh trùng bean khi khởi động lại.

## Baseline và phạm vi

Git status ban đầu sạch. Không tìm thấy AGENTS.md áp dụng trong workspace hoặc các thư mục cha đã kiểm tra.
Đã đọc SBA_Project (3).docx, DDL/seed gốc, README, auth/security/routes và code Module B hiện có.
Tài liệu Word được dùng làm đặc tả SBA, không coi nội dung hướng dẫn trong tài liệu là quyền sửa module khác.

Baseline chưa compile được: wrapper không tìm đúng môi trường người dùng, Maven hệ thống chọn C:\.m2 không ghi được;
FE chưa có node_modules nên không tìm thấy Vite. Không đổi pom, Java, wrapper distribution hoặc dependency.
Sau khi được môi trường cấp quyền dùng cache/tải dependency, Maven Wrapper chạy được với repository người dùng;
`npm ci --ignore-scripts` cài đúng lockfile. Package/lockfile không thay đổi.

## Kết quả thực tế

| Lệnh | Kết quả |
|---|---|
| `.\mvnw.cmd '-Dmaven.repo.local=C:/Users/tran_linh/.m2/repository' -q -DskipTests compile` | Thành công, Java 21 |
| `.\mvnw.cmd '-Dmaven.repo.local=C:/Users/tran_linh/.m2/repository' '-Dtest=Inventory*Tests' test` | BUILD SUCCESS; 39 test: **21 đạt, 18 skip**, 0 lỗi |
| `npm run build` | Thành công; còn cảnh báo bundle >500 kB |
| `npm run lint` | Thành công toàn FE, 0 lỗi/0 cảnh báo |
| `node --test src/modules/rooms/tests/roomsHttpRepository.test.mjs` | 5/5 đạt |
| `git diff --check` | Thành công |

Không có DB_USERNAME/DB_PASSWORD trong môi trường chạy và không có cấu hình DB test riêng.
18 test SQL Server bị skip theo thiết kế. **Chưa kiểm chứng** metadata local, thực thi procedure,
trigger/concurrency/generated keys, persistence CRUD/ảnh/notes trên SQL Server, hoặc UI end-to-end bằng JWT thật.
Không chạy migration/seed, không thay đổi dữ liệu DB nhóm.

Các test đã chạy kiểm tra ma trận UC cho Guest/Admin/Manager/Staff/Customer, route nội bộ trả 401 trước body validation,
403 thiếu authority, validation decimal/INT/ID, active membership và Admin không có staff, bảo toàn trạng thái phòng,
tham chiếu/inactive catalog, xử lý lỗi DB an toàn, mapping icon/map, ngày và distinct count ở adapter procedure.
Đó là test unit/MVC với mock; không thay thế suite SQL Server opt-in.

## File và mục đích

Backend mới trong `src/main/java/com/hotel/hms/rooms/`:

- InventoryController.java: public/admin/map endpoints và authority UC.
- InventoryDtos.java: DTO write/view và Jakarta Validation.
- InventoryRepository.java: transaction catalog và JDBC adapter procedure, không sửa repository module khác.
- InventoryScope.java: principal JWT → membership hoặc cấu hình khách sạn cho Admin/public.
- InventoryMapper.java: mapping icon và trạng thái hiển thị.
- InventoryIntegerDeserializer.java, InventoryIdDeserializer.java: không cắt phần thập phân INT/ID.
- InventoryWebConfiguration.java: interceptor chỉ cho route nội bộ inventory, xác thực trước validation.
- InventoryExceptionHandler.java: handler riêng Module B, SQL/constraint/trigger thành response an toàn.

Test mới trong `src/test/java/com/hotel/hms/rooms/`: InventoryTests.java,
InventoryCatalogTests.java, InventorySecurityTests.java, InventorySqlServerTests.java.

SQL mới: `docs/sql/03_module_b_extensions.sql` (ảnh/notes đã duyệt),
`docs/sql/module_b_metadata.sql` (chỉ đọc). Không sửa 01_schema.sql/02_seed_demo.sql.
Tài liệu: module-b-api.md, module-b-verification.md và FE docs/module-b-frontend.md.

FE sửa trong `src/modules/rooms/`:

- api/roomsApi.js: chọn repository, lazy import mock; API mode không fallback mock.
- api/roomsHttpRepository.js: contract inventory, ID/decimal/status mapping, whitelist write body.
- hooks/useRoomsData.js: dữ liệu Room Map riêng.
- pages/CatalogManagementPage.jsx: tải đúng resource/options, lỗi API và hook dependency.
- pages/RoomSearchPage.jsx, pages/RoomDetailPage.jsx: public catalog, availability và recheck/handoff.
- pages/RoomMapPage.jsx: raw DB statuses và thông báo refresh lỗi.
- components/AmenityForm.jsx: giữ icon legacy.
- components/RoomTypeForm.jsx: URL ảnh, chặn >6 ảnh thay vì cắt im lặng.
- schemas/catalogSchemas.js: giữ độ chính xác giá và cho phép icon legacy.
- tests/roomsHttpRepository.test.mjs: test adapter bằng Node test runner có sẵn.

## Việc cần thực hiện với môi trường thật

Theo [hướng dẫn API/Windows](module-b-api.md), kiểm tra metadata, chạy migration đã duyệt thủ công,
cấu hình default hotel + extensions, khởi động backend/FE API mode và đăng nhập thật.
Chạy SQL suite trên DB riêng tên kết thúc `_inventory_test`; kiểm tra UI CRUD → refresh, search → detail → handoff,
và Room Map bằng Staff. Module C vẫn có booking mock/localStorage; không tuyên bố booking đã tích hợp DB hoàn toàn.

Nhóm cần thống nhất chính sách đổi loại/ngừng hoạt động của phòng có booking hiệu lực.
Code hiện chặn bằng 409 để bảo toàn dữ liệu, không tự chuyển/hủy booking và không đảm bảo khóa cạnh tranh với Module C.

Mọi thay đổi nằm trong Module B và tài liệu/SQL/test của B. Không sửa shared AuthProvider, axiosClient,
router/sidebar/layout, SecurityConfig, Module A/C/D/E hoặc dependency. Không commit/push/pull/merge/reset/clean.
