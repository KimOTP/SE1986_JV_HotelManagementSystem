# Module B — kết quả kiểm tra

## Rà soát toàn Module B — 10/11/2026

Đã rà FE, backend, phân quyền, mapping JPA, upload và các file schema/seed liên quan.
Các lỗi đã sửa trong lượt này:

- Tìm lại cùng ngày/số khách gọi API mới; URL trống hoặc không hợp lệ xóa kết quả cũ.
- Bỏ qua phản hồi tìm phòng/sơ đồ phòng cũ khi yêu cầu mới đã bắt đầu hoặc component bị đóng.
- Lỗi availability nằm cạnh form và có nút thử lại; đổi sang điều kiện không hợp lệ không bị kẹt loading.
- Trang chi tiết xóa lỗi khi chuyển loại phòng; recheck đặt phòng cũ không điều hướng sau khi đổi ngày.
- Ngày phải tồn tại trong lịch (không nhận 30/02); tính đêm qua ngày nhuận có regression test.
- Gallery không liên tục tải lại cùng ảnh fallback khi ảnh đó cũng lỗi.
- Xóa placeholder `rooms/pages/BookingHandoffPage.jsx` không còn được import;
  router dùng handoff của Module C. Không sửa router hay code Module C.
- Seed bật QUOTED_IDENTIFIER để phù hợp filtered index khi chạy bằng sqlcmd;
  sửa hướng dẫn trỏ tới schema/migration hiện có. Không chạy lại schema/seed trên DB local.

Kiểm tra: 12 test Node FE đạt; lint Module B, Prettier file sửa, build FE và diff check đạt.
Backend chạy lại 58 test: 40 đạt, 18 test fixture bỏ qua do chưa cấu hình DB riêng, 0 lỗi;
bao gồm schema validation/JPA/procedure đọc từ DB local.
Headless Edge với API fixture đã đạt 6 tình huống: tìm lại cùng điều kiện, URL sai/xóa URL,
retry availability, điều kiện sai khi đang tải, phục hồi từ ID không tồn tại và đổi ngày trong lúc recheck.
Browser fixture/harness nằm trong target bị Git bỏ qua; không thêm dependency hay file cấu hình dùng chung.
Không ghi/xóa dữ liệu DB trong lượt rà soát; chưa thử CRUD/upload qua trình duyệt với DB thật.

## Gỡ hoàn toàn biểu tượng tiện nghi — 10/11/2026

Đã xóa component AmenityIcon và các chỗ hiển thị của nó trong Module B; API tiện nghi chỉ còn
id, name, description, isActive. Đã gỡ field tương ứng khỏi DTO, entity, mapper và repository,
đồng thời cập nhật schema/seed cho DB mới. Không tìm thấy module khác dùng field/component này;
không sửa code module A/C/D/E.

Đã được người dùng đồng ý và chạy `scripts/migrate-remove-amenity-icon.sql` trên DB local
`HotelManagement_SBA`: cột biểu tượng đã bị xóa. Đối chiếu trước/sau xác nhận giữ nguyên
cả 4 tiện nghi (ID, tên, mô tả, trạng thái) và 10 liên kết với loại phòng.
Trước khi chạy đã kiểm tra cú pháp bằng PARSEONLY và metadata không thấy index hay SQL expression
phụ thuộc cột. Không chạy lại schema/seed; không thay đổi dữ liệu module khác.

Đã chạy 58 test backend: 40 đạt, 18 bỏ qua do thiếu DB fixture riêng, 0 lỗi.
Bao gồm kiểm tra schema/JPA và đọc procedure trên DB local (không ghi dữ liệu), cùng test tạo tiện nghi
chỉ với tên, mô tả, trạng thái và response đúng 4 trường. 9 test FE, lint, Prettier và build FE đạt.
Sau khi xóa cột trên DB local, đã chạy lại riêng `InventoryJpaSchemaTests` với opt-in:
schema validation, đọc catalog và procedure đều đạt; không tạo fixture hay ghi dữ liệu trong test này.

## Đồng bộ phân quyền — 10/11/2026

Module B kiểm tra authority UC, không phụ thuộc role STAFF. Đã đổi test sang RECEPTIONIST/HOUSEKEEPER
và kiểm tra phạm vi khách sạn cho cả hai role. Ma trận theo seed mới:
ADMIN quản trị B1/B2/B3, không có B6; MANAGER/RECEPTIONIST/HOUSEKEEPER xem sơ đồ với B6,
không có quyền ghi danh mục; CUSTOMER không có B6. Không sửa code module A/C/D/E hay cấu hình chung.

Đã chạy hai script có sẵn trên `HotelManagement_SBA` ở máy local theo thứ tự
`scripts/migrate-split-staff-role.sql`, `scripts/migrate-admin-minimal-permissions.sql`.
Kiểm tra sau migration: không còn role STAFF; hai user cũ chuyển thành một RECEPTIONIST và một HOUSEKEEPER;
ADMIN chỉ còn A2–A6/B1–B3; RECEPTIONIST có thêm C5. Không chạy lại schema/seed hay sửa dữ liệu phòng/ảnh.
Đăng xuất và đăng nhập lại để giao diện nạp vai trò/quyền mới.

Kiểm tra backend: 31 test Inventory đạt, 19 test DB chưa bật opt-in nên bỏ qua; 8 test lưu ảnh đạt khi chạy riêng.
Lượt chạy ban đầu bị lỗi dọn thư mục tạm Windows ở test lưu ảnh; chạy lại với
`-DargLine=-Djava.io.tmpdir=<thư mục target/room-image-test-tmp trong project>` thì cả 8 test đạt.
Tổng kết các report: 39 đạt, 19 bỏ qua, 0 lỗi. Chưa kiểm tra đăng nhập qua trình duyệt trong lượt này.

## Upload ảnh loại phòng — 04/11/2026

Đã thêm RoomImageController, RoomImageStorageService, UploadedRoomImage và chọn file trên RoomTypeForm.
UC-B1 kiểm soát upload; đọc ảnh public. Binary JPG/PNG lưu thư mục riêng ngoài repo/target,
URL vẫn lưu trong room_type_images qua JPA hiện có. Không đổi schema, dependency, multipart/security chung.
Giới hạn 5 MB/file, 6 ảnh/loại phòng, kiểm tra định dạng thực và pixel, re-encode trước khi lưu,
tên UUID, chặn đọc path tùy ý. Ảnh vẫn đọc được sau khi tạo lại service với cùng thư mục.

Đã chạy `-Dtest=Inventory*Tests,RoomImageStorageTests`: **58 test, 39 đạt, 19 skip, 0 lỗi**.
19 skip gồm 18 test fixture cần DB riêng và 1 test chỉ đọc DB local chưa bật opt-in trong lượt này;
kết quả kiểm tra chỉ đọc DB local trước đó ở phần JPA bên dưới.
9 test FE đạt; `npm run build`, `npm run lint`, Prettier check file sửa và `git diff --check` đạt.
Test lưu file dùng thư mục tạm do JUnit quản lý; không tạo file ảnh hoặc fixture trong DB/môi trường người dùng.
Chưa thao tác upload end-to-end trên trình duyệt. Khi thử thực tế: restart backend, mở form loại phòng,
chọn JPG/PNG, chờ preview, bấm Lưu và refresh để xác nhận URL còn trong database.
File không còn liên kết sau khi hủy form/gỡ URL chưa được tự động dọn; xem chính sách lưu trữ trong tài liệu API.

## Chuyển sang Spring Data JPA — 04/11/2026

Catalog đã chuyển sang RoomType/Room/Amenity/RoomTypeImage/RoomImage và CatalogAudit.
Năm interface JpaRepository xử lý persistence, InventoryRepository giữ vai trò facade,
InventoryReferenceRepository dùng EntityManager cho procedure/booking/khóa hotel.
AvailableRoom chuyển sang dto. API/DTO, scope và quyền UC giữ nguyên.
Entity dùng tên Catalog* riêng và quan hệ không cascade xóa sang module khác.
Không thay pom/dependency/config dùng chung, schema SQL hoặc nghiệp vụ A/C/D/E.
Thay đổi format Rooms có sẵn trước công việc JPA được bảo toàn.

Đã chạy:

```powershell
.\mvnw.cmd '-Dmaven.repo.local=C:/Users/tran_linh/.m2/repository' '-Dtest=Inventory*Tests' '-Dinventory.verify-local-schema=true' clean test
```

Kết quả: **49 test, 31 đạt, 18 skip, 0 lỗi**. Hibernate metadata xác nhận entity names,
JPQL/derived queries, mapping read-only của status/rowversion/hotelId và JDBC generated keys cho IDENTITY.
Test repository kiểm tra mapping entity/DTO, cập nhật trạng thái không bị ghi đè, default refresh,
thay ảnh theo đúng thứ tự để không xung đột unique và giữ ID/decimal chính xác.

Đã kiểm tra **SQL Server local bằng thao tác chỉ đọc**: metadata inventory, schema validation JPA,
các truy vấn catalog/rooms/amenities/image relations và procedure availability với roomTypeId null/cụ thể.
Định nghĩa procedure local được đối chiếu DDL SELECT-only trước khi gọi. Không tạo fixture, booking/hold,
không chạy seed/migration hoặc thay dữ liệu DB local/nhóm.

18 test có ghi fixture qua JPA vẫn skip vì chưa cấu hình DB riêng `_inventory_test`.
Vì vậy **chưa xác minh insert/update/delete JPA trên SQL Server thực**, bao gồm hành vi trigger khi ghi.
Metadata test về generated keys không thay thế kiểm thử ghi thực tế.
`git diff --check` đạt; danh sách thay đổi chỉ thuộc source/test/tài liệu Module B.

Các mục dưới đây là báo cáo ban đầu và lần tái cấu trúc package trước JPA, giữ để tham khảo lịch sử.

## Cập nhật tái cấu trúc package

Các lớp production hiện được chia trong rooms.controller, dto, entity, repository,
security và service. InventoryExceptionHandler nằm trong controller,
InventoryWebConfiguration trong security, InventoryMapper trong service.
InventoryService sở hữu logic nghiệp vụ và transaction. Catalog hiện dùng Spring Data JPA:
RoomType/Room/Amenity/RoomTypeImage/RoomImage là entity có tên riêng Catalog*;
InventoryRepository điều phối JpaRepository, InventoryReferenceRepository gọi procedure/đọc booking bằng EntityManager.
AvailableRoom đã chuyển sang DTO, không còn là entity. Không thay entity/schema của module khác.
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
| `node --test src/modules/rooms/tests/roomsApi.test.mjs` | 5/5 đạt |
| `git diff --check` | Thành công |

Không có DB_USERNAME/DB_PASSWORD trong môi trường chạy và không có cấu hình DB test riêng.
18 test SQL Server bị skip theo thiết kế. **Chưa kiểm chứng** metadata local, thực thi procedure,
trigger/concurrency/generated keys, persistence CRUD/ảnh/notes trên SQL Server, hoặc UI end-to-end bằng JWT thật.
Không chạy migration/seed, không thay đổi dữ liệu DB nhóm.

Các test đã chạy kiểm tra ma trận UC cho Guest/Admin/Manager/Staff/Customer, route nội bộ trả 401 trước body validation,
403 thiếu authority, validation decimal/INT/ID, active membership và Admin không có staff, bảo toàn trạng thái phòng,
tham chiếu/inactive catalog, xử lý lỗi DB an toàn, mapping trạng thái, ngày và distinct count ở adapter procedure.
Đó là test unit/MVC với mock; không thay thế suite SQL Server opt-in.

## File và mục đích

Backend mới trong `src/main/java/com/hotel/hms/rooms/`:

- InventoryController.java: public/admin/map endpoints và authority UC.
- InventoryDtos.java: DTO write/view và Jakarta Validation.
- InventoryRepository.java: transaction catalog và JDBC adapter procedure, không sửa repository module khác.
- InventoryScope.java: principal JWT → membership hoặc cấu hình khách sạn cho Admin/public.
- InventoryMapper.java: mapping DTO và trạng thái hiển thị.
- InventoryIntegerDeserializer.java, InventoryIdDeserializer.java: không cắt phần thập phân INT/ID.
- InventoryWebConfiguration.java: interceptor chỉ cho route nội bộ inventory, xác thực trước validation.
- InventoryExceptionHandler.java: handler riêng Module B, SQL/constraint/trigger thành response an toàn.

Test mới trong `src/test/java/com/hotel/hms/rooms/`: InventoryTests.java,
InventoryCatalogTests.java, InventorySecurityTests.java, InventorySqlServerTests.java.

SQL hiện dùng `docs/sql/01_schema_complete_module_b.sql` và `docs/sql/02_seed_demo.sql` cho DB mới.
DB cũ bổ sung ảnh/notes bằng `scripts/migrate-existing-db-module-b.sql`;
kiểm tra chỉ đọc bằng test opt-in `InventoryJpaSchemaTests`.
Tài liệu: module-b-api.md, module-b-verification.md và FE docs/module-b-frontend.md.

FE sửa trong `src/modules/rooms/`:

- api/roomsApi.js: hiện gộp toàn bộ HTTP contract inventory, ID/decimal/status mapping và whitelist write body; chỉ dùng API.
- hooks/useRoomsData.js: dữ liệu Room Map riêng.
- pages/CatalogManagementPage.jsx: tải đúng resource/options, lỗi API và hook dependency.
- pages/RoomSearchPage.jsx, pages/RoomDetailPage.jsx: public catalog, availability và recheck/handoff.
- pages/RoomMapPage.jsx: raw DB statuses và thông báo refresh lỗi.
- components/AmenityForm.jsx: chỉ có tên, mô tả và trạng thái tiện nghi.
- components/RoomTypeForm.jsx: upload ảnh từ máy, chặn >6 ảnh thay vì cắt im lặng; đã bỏ ô dán URL.
- schemas/catalogSchemas.js: giữ độ chính xác giá và validation trường form.
- tests/roomsApi.test.mjs: test API bằng Node test runner có sẵn.

## Việc cần thực hiện với môi trường thật

Theo [hướng dẫn API/Windows](module-b-api.md), kiểm tra metadata, chạy migration đã duyệt thủ công,
cấu hình default hotel + extensions, khởi động backend/FE API mode và đăng nhập thật.
Chạy SQL suite trên DB riêng tên kết thúc `_inventory_test`; kiểm tra UI CRUD → refresh, search → detail → handoff,
và Room Map bằng RECEPTIONIST/HOUSEKEEPER. Module C vẫn có booking mock/localStorage; không tuyên bố booking đã tích hợp DB hoàn toàn.

Nhóm cần thống nhất chính sách đổi loại/ngừng hoạt động của phòng có booking hiệu lực.
Code hiện chặn bằng 409 để bảo toàn dữ liệu, không tự chuyển/hủy booking và không đảm bảo khóa cạnh tranh với Module C.

Mọi thay đổi nằm trong Module B và tài liệu/SQL/test của B. Không sửa shared AuthProvider, axiosClient,
router/sidebar/layout, SecurityConfig, Module A/C/D/E hoặc dependency. Không commit/push/pull/merge/reset/clean.
