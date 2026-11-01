# Module B — Room Catalog & Availability

Phạm vi SBA_Project (3): UC-B1 types, B2 rooms, B3 amenities, B4 public search,
B5 room-type detail, B6 protected map. Workspace sạch tại thời điểm bắt đầu.
Không thay đổi Module A/C/D/E, dependency, shared auth/router/security hoặc script schema/seed gốc.
Thiết kế ảnh/notes đã được chủ Module B đồng ý trong phiên làm việc; migration chưa được tự chạy.

## Cấu trúc package backend

```text
com.hotel.hms.rooms
├── controller   InventoryController, InventoryExceptionHandler
├── dto          InventoryDtos, InventoryIdDeserializer, InventoryIntegerDeserializer
├── entity       AvailableRoom
├── repository   InventoryRepository
├── security     InventoryScope, InventoryWebConfiguration
└── service      InventoryService, InventoryMapper
```

Controller gọi service. Service chứa quy tắc catalog/availability và transaction;
repository chứa JDBC/SQL, stored procedure và thao tác khóa dữ liệu.
AvailableRoom là projection chỉ đọc cho kết quả procedure JDBC, không phải JPA entity mới.
DTO REST giữ tách biệt với projection nội bộ này. Endpoint và schema không đổi khi chuyển package.
Tên package Java hiện là `rooms` để đồng nhất với FE. Schema SQL `inventory`,
API `/api/inventory` và các biến `INVENTORY_*` vẫn giữ nguyên để tương thích cấu hình hiện tại.

## Chạy trên Windows

1. Dùng Java 21 và database hiện có `HotelManagement_SBA`. Không chạy lại schema/seed trên DB nhóm.
2. Kiểm tra đúng server/database, chạy script chỉ đọc `docs/sql/module_b_metadata.sql` để đối chiếu DDL.
3. Sau khi kiểm tra/backup theo quy trình nhóm, chạy thủ công `docs/sql/03_module_b_extensions.sql`
   một lần trong SSMS. Script idempotent khi cấu trúc đích đúng; nếu đã có cột/bảng khác cấu trúc,
   phải đối chiếu metadata trước. Không tự sửa một cấu trúc khác thiết kế.
4. Đặt credential qua môi trường; không đặt password trong file có version control.

```powershell
cd SE1986_JV_HMS_be
# DB_USERNAME và DB_PASSWORD: cấu hình riêng trong môi trường chạy.
# DB_HOST/DB_PORT: theo máy SQL Server của nhóm.
$env:INVENTORY_DEFAULT_HOTEL_ID = '<ID khách sạn active đã kiểm tra>'
$env:INVENTORY_EXTENSIONS_ENABLED = 'true'
.\mvnw.cmd spring-boot:run
```

`inventory.default-hotel-id` không có mặc định ID=1. Giá trị thiếu/khách sạn không active trả 503.
Đọc từ biến `INVENTORY_DEFAULT_HOTEL_ID` hoặc `--inventory.default-hotel-id=...`.
Public dùng khách sạn cấu hình. Nội bộ lấy staff membership active theo ID principal JWT,
kiểm tra user/hotel active. Admin không có staff dùng khách sạn cấu hình server.
Không nhận hotelId từ request; không tự chọn một khách sạn khi nhiều khách sạn tồn tại.
Amenities là danh mục toàn hệ thống theo DDL, chỉ người có UC-B3 được quản trị.

`INVENTORY_EXTENSIONS_ENABLED` mặc định false. Khi chưa bật, API vẫn phục vụ catalog/procedure
trên schema gốc nhưng trả 409 nếu ghi ảnh/notes có dữ liệu; không báo lưu thành công giả.
Chỉ bật true sau migration. Giữ `ddl-auto=validate`, `sql.init.mode=never`.
Mapping JDBC riêng Module B không được Hibernate validate: phải chạy metadata và integration suite.

Frontend `.env.local` (cấu hình thủ công, không chứa secret):

```dotenv
VITE_ROOMS_DATA_SOURCE=api
VITE_AUTH_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

```powershell
cd SE1986_JV_HMS_fe
npm ci
npm run dev
```

Nếu dùng `/api` thay URL tuyệt đối, cấu hình proxy hiện có phải trỏ backend.
JWT/refresh dùng axiosClient/AuthProvider sẵn có. Không thêm `/api` lần nữa vào adapter.

## API contract

Base `/api/inventory`. JSON trực tiếp, không envelope. Mọi ID response là **string số BIGINT**,
không dùng ID mock và không ép ID thành JS Number. Số tiền basePrice response là chuỗi decimal
để giữ DECIMAL(18,2); request chấp nhận chuỗi decimal. `availableRooms` là integer.

| Method | Path tương đối | Quyền / nội dung |
|---|---|---|
| GET | `/public/catalog` | Guest; `{roomTypes: [...], amenities: [...]}`; không có phòng vật lý |
| GET | `/public/room-types/{id}` | Guest; chi tiết **loại phòng**, không phải phòng vật lý |
| GET | `/public/search?checkIn=yyyy-MM-dd&checkOut=yyyy-MM-dd&guests=2` | Guest; array RoomTypeView có availableRooms > 0 |
| GET | `/public/room-types/{id}/availability?checkIn=...&checkOut=...&guests=2` | Guest; RoomTypeView có availableRooms, có thể bằng 0 |
| GET | `/admin/room-types` | UC-B1; gồm inactive |
| GET | `/admin/room-types/{id}` | UC-B1; chi tiết quản trị gồm inactive |
| GET | `/admin/room-types/options` | UC-B1; tiện nghi cho form, gồm inactive |
| GET | `/admin/rooms` | UC-B2; phòng vật lý trong phạm vi |
| GET | `/admin/rooms/options` | UC-B2; loại phòng cho form, gồm inactive |
| GET | `/admin/amenities` | UC-B3; danh mục tiện nghi toàn bảng |
| POST | `/admin/{resource}` | room-types: UC-B1, rooms: UC-B2, amenities: UC-B3; 201 + DTO |
| PUT | `/admin/{resource}/{id}` | Cùng quyền resource; 200 + DTO |
| PATCH | `/admin/{resource}/{id}/active` | Cùng quyền; body `{isActive: false}`; 200 + DTO |
| DELETE | `/admin/{resource}/{id}` | Cùng quyền; 204 khi xóa thành công |
| GET | `/room-map` | UC-B6; `{rooms, roomTypes, amenities: []}` trong phạm vi khách sạn |

Public không yêu cầu JWT. Nội bộ: Guest 401; có JWT nhưng thiếu authority UC trả 403.
Theo seed Admin có B1–B6; Manager/Staff có B6, Customer không có B6.
Role ADMIN riêng lẻ không thay thế UC authority. Không sửa permission seed.

DTO ghi (PUT là thay toàn bộ trường catalog cho phép; PATCH chỉ thay active):

```json
{
  "name": "Deluxe", "description": "Phòng cao cấp", "basePrice": "800000.00",
  "capacity": 3, "area": 30, "bedType": "1 giường đôi và 1 giường đơn",
  "images": ["https://example.com/deluxe.jpg"], "amenityIds": ["1", "2"], "isActive": true
}
```

```json
{"roomNumber":"201","floor":2,"roomTypeId":"2","notes":"Gần thang máy","isActive":true}
```

```json
{"name":"Wi-Fi","iconKey":"Wifi","description":"Internet","isActive":true}
```

RoomTypeView: `id,name,description,basePrice,capacity,area,bedType,images,amenityIds,isActive,availableRooms`.
Ngoài availability/search, availableRooms có thể null. RoomView:
`id,roomNumber,floor,roomTypeId,notes,isActive,operationalStatus,housekeepingStatus,displayStatus`.
AmenityView: `id,name,iconKey,description,isActive`.

Lỗi dùng `{code,message}` theo convention chung: 400 request/validation; 401 Guest ở route nội bộ;
403 thiếu UC/phạm vi; 404 ID không tồn tại hoặc ngoài khách sạn; **410** loại phòng public inactive;
409 unique/FK/trigger/tham chiếu/booking hiệu lực; 503 cấu hình khách sạn chưa hợp lệ;
500 lỗi dữ liệu nội bộ với thông báo an toàn, không SQL/stack/credential.
Loại phòng hết chỗ trả 200 + availableRooms=0, khác inactive và không tồn tại.

## Mapping và transaction

| FE / DTO | Database |
|---|---|
| RoomType.id, capacity, bedType, area, isActive | room_type_id, max_guests, bed_description, area_m2, is_active |
| Room.id, roomTypeId, roomNumber, floor, isActive | room_id, room_type_id, room_number, floor_number, is_active |
| Room.notes | inventory.rooms.notes NVARCHAR(2000), migration mới |
| RoomType.images | inventory.room_type_images, FK room_type_id, sort_order 0–5 unique |
| Amenity.id, iconKey | amenity_id, icon qua mapper |
| RoomType.amenityIds | inventory.room_type_amenities |

Không dùng inventory.room_images để lưu ảnh loại phòng. Bảng ảnh phòng vật lý giữ nguyên.
SQL mới thêm cột nullable và bảng riêng không cascade; không ghi row_version/audit từ client.
Không có optimistic locking: không tuyên bố chống lost update bằng rowversion.

CRUD dùng transaction tại InventoryService cùng DataSource hiện có. Adapter JDBC nằm trong rooms.repository,
không thêm entity/bean trùng với HotelRoom/RoomTypeRef/IssueRoom. Giữ JPA của module khác.
Insert dùng JDBC RETURN_GENERATED_KEYS, không dùng Hibernate OUTPUT INSERTED trên bảng có trigger;
đường này có test opt-in trên SQL Server, chưa coi là đã xác minh nếu suite bị skip.
Chuỗi insert dùng setNString, chuỗi update đi qua JDBC driver SQL Server mặc định Unicode.

Unique loại phòng theo hotel/name, tiện nghi toàn bảng và room number theo trigger DB.
Không chỉ dựa exists-check; SQL error 2601/2627/547/51001/51002 và deadlock 1205 thành 409.
Mỗi lần sửa phòng giữ nguyên operational_status và housekeeping_status. Room mới dùng default DB.
Tham chiếu inactive cũ được giữ khi sửa; không cho gán mới tiện nghi/loại phòng inactive.
Delete tiện nghi/phòng bị FK chặn nếu đang được tham chiếu; không tự deactivate.
Delete loại phòng chỉ xóa được nếu không còn phòng vật lý; gỡ liên kết tiện nghi/ảnh riêng trong transaction.

Quyết định bảo toàn dữ liệu hiện tại: phòng có CONFIRMED/CHECKED_IN hoặc PENDING hold còn hiệu lực
trả 409 khi đổi loại/ngừng hoạt động. Đây là chính sách catalog thận trọng cần nhóm thống nhất
nếu muốn đổi phòng đã được đặt; chưa thêm workflow di chuyển/hủy booking.
Không khóa hay sửa booking; cạnh tranh với tạo booking phải được Module C giải quyết trong transaction.

Icon DB ↔ FE: wifi↔Wifi, snow↔Snow, tv↔Tv, water↔Droplet, cup-hot↔CupHot,
shield-lock↔ShieldLock, sun↔Sun. Icon lạ giữ nguyên giá trị; FE fallback CheckCircle và có option giữ icon cũ.

## Availability và Room Map

Service gọi nguyên procedure `inventory.search_available_rooms` với tham số bind.
Procedure trả phòng vật lý; service group theo room_type_id và distinct room_id, không tải booking vào Java.
Active hotel/type/room, capacity đủ, không MAINTENANCE. OCCUPIED hiện tại, DIRTY/CLEANING không tự chặn tương lai.
Khoảng [in,out); overlap `existingIn < requestedOut AND existingOut > requestedIn`.
CONFIRMED/CHECKED_IN chặn; PENDING chỉ chặn nếu `hold_expires_at > SYSUTCDATETIME()`.
CANCELLED/EXPIRED/CHECKED_OUT và PENDING hold hết hạn không chặn. Không cần job đổi status.
Không tự cấm ngày quá khứ trên backend; UI cũ có kiểm tra ngày quá khứ và được giữ nguyên.

Room Map ưu tiên MAINTENANCE → OCCUPIED → DIRTY (DIRTY hoặc CLEANING) → READY (AVAILABLE/CLEAN).
Đây là displayStatus riêng, không ghi READY/DIRTY vào operational_status.
API giữ hai trạng thái gốc; adapter FE giữ rawOperationalStatus, housekeepingStatus và dùng displayStatus cho UI cũ.
Modal hiển thị cả trạng thái DB, giúp phân biệt CLEANING; active độc lập với trạng thái.
Thống kê/filter dựa dữ liệu DB vừa tải, refresh thủ công; không lấy task mock hoặc thêm WebSocket.

## Contract Module C

Module C có thể gọi public search/detail/availability như bảng trên.
Handoff giữ `roomTypeId,checkIn,checkOut,guests,roomCount` qua `/rooms/booking-handoff` hiện có.
Search không giữ chỗ, không tạo booking và không đảm bảo chống overbooking.
Module C phải kiểm tra lại availability trong transaction tạo/giữ phòng.
Code booking FE hiện vẫn có store mock/localStorage; việc handoff dùng chi tiết B thật
không có nghĩa toàn bộ tạo booking đã dùng SQL Server. Không sửa Module C trong thay đổi này.

Ví dụ PowerShell/curl (ID/ngày là ví dụ, thay bằng dữ liệu thực tế):

```powershell
curl.exe 'http://localhost:8080/api/inventory/public/search?checkIn=2030-01-10&checkOut=2030-01-12&guests=2'
curl.exe 'http://localhost:8080/api/inventory/public/room-types/2'
curl.exe 'http://localhost:8080/api/inventory/public/room-types/2/availability?checkIn=2030-01-10&checkOut=2030-01-12&guests=2'
curl.exe -H "Authorization: Bearer $env:HMS_ACCESS_TOKEN" 'http://localhost:8080/api/inventory/room-map'
curl.exe -H "Authorization: Bearer $env:HMS_ACCESS_TOKEN" -H 'Content-Type: application/json' -X POST --data-binary '@room-type.json' 'http://localhost:8080/api/inventory/admin/room-types'
```

Đăng nhập thật để lấy access token; không lưu token vào repo hoặc tạo token giả.

## Kiểm chứng

```powershell
cd SE1986_JV_HMS_be
.\mvnw.cmd -DskipTests compile
.\mvnw.cmd '-Dtest=Inventory*Tests' test
# Nếu Maven mặc định chọn repository không ghi được:
.\mvnw.cmd "-Dmaven.repo.local=$env:USERPROFILE/.m2/repository" '-Dtest=Inventory*Tests' test
cd ../SE1986_JV_HMS_fe
npm run build
npm run lint
node --test src/modules/rooms/tests/roomsHttpRepository.test.mjs
```

SQL integration chỉ chạy với DB **riêng**, tên kết thúc `_inventory_test`, đã có schema/procedure/migration.
Tạo DB/schema từ bản sao script khởi tạo dành riêng môi trường test, thay tên DB trong bản sao;
không sửa script gốc hoặc chạy script trên DB nhóm. Không cần seed vì test tự tạo fixture trong transaction rollback.
Suite không đọc DB_* và không dùng HotelManagement_SBA.

```powershell
$env:INVENTORY_TEST_JDBC_URL = 'jdbc:sqlserver://localhost:1433;databaseName=HotelManagement_inventory_test;encrypt=true;trustServerCertificate=true'
# INVENTORY_TEST_USERNAME và INVENTORY_TEST_PASSWORD: cấu hình ngoài repo.
.\mvnw.cmd '-Dtest=InventorySqlServerTests' test
```

Suite bao phủ overlap, boundary checkout, từng blocking status/hold, inactive hotel/type/room,
maintenance, occupied tương lai, dirty/cleaning, capacity, distinct count, generated keys với trigger,
notes/images Unicode, bảo toàn trạng thái và FK delete. Không có URL test thì **skip**, không phải pass SQL.
SQL trigger/concurrency/procedure và CRUD-refresh end-to-end cần chạy trên môi trường thật phù hợp.
Không tạo/xóa fixture tùy tiện trên DB nhóm; ngày seed theo UTC lúc seed, không mặc định là hôm nay.
