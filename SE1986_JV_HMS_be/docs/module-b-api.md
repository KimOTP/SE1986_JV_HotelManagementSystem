# Module B — Room Catalog & Availability

Phạm vi SBA_Project (3): UC-B1 types, B2 rooms, B3 amenities, B4 public search,
B5 room-type detail, B6 protected map. Workspace sạch tại thời điểm bắt đầu.
Không thay đổi Module A/C/D/E, dependency, shared auth/router/security hoặc script schema/seed gốc.
Thiết kế ảnh/notes đã được chủ Module B đồng ý trong phiên làm việc; migration chưa được tự chạy.

## Cấu trúc package backend

```text
com.hotel.hms.rooms
├── controller   InventoryController, InventoryExceptionHandler
├── dto          InventoryDtos, AvailableRoom, InventoryIdDeserializer, InventoryIntegerDeserializer
├── entity       RoomType, Room, Amenity, RoomTypeImage, RoomImage, CatalogAudit
├── repository   InventoryRepository, RoomTypeRepository, RoomRepository,
│                AmenityRepository, RoomTypeImageRepository, RoomImageRepository,
│                InventoryReferenceRepository
├── security     InventoryScope, InventoryWebConfiguration
└── service      InventoryService, InventoryMapper
```

Upload ảnh có thêm `RoomImageController`, `UploadedRoomImage` và `RoomImageStorageService`
trong các package controller/dto/service tương ứng.

Controller gọi service. Service chứa quy tắc catalog/availability và transaction;
Catalog dùng Spring Data JPA (`JpaRepository`), facade InventoryRepository điều phối persistence;
InventoryReferenceRepository dùng EntityManager để gọi procedure, đọc booking và khóa hotel.
AvailableRoom là DTO chỉ đọc cho kết quả procedure, không phải JPA entity.
Entity REST không serialize trực tiếp. Scope principal vẫn dùng adapter đọc identity riêng Module B.
Endpoint và schema không đổi khi chuyển sang JPA.
Tên package Java hiện là `rooms` để đồng nhất với FE. Schema SQL `inventory`,
API `/api/inventory` và các biến `INVENTORY_*` vẫn giữ nguyên để tương thích cấu hình hiện tại.

## Chạy trên Windows

1. Dùng Java 21 và database hiện có `HotelManagement_SBA`. Không chạy lại schema/seed trên DB nhóm.
2. Kiểm tra database đã có `inventory.rooms.notes NVARCHAR(2000)` và `inventory.room_type_images`
   đúng thiết kế. Bản schema hoàn chỉnh trong `docs/sql/01_schema_complete_module_b.sql` đã có cả hai.
3. Database tạo bằng schema cũ phải bổ sung notes và ảnh trước khi khởi động JPA.
   Không chạy lại schema hoàn chỉnh trên DB đã có dữ liệu. Không dùng ddl-auto=update để bỏ qua migration.
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

`INVENTORY_EXTENSIONS_ENABLED` mặc định false; bật true để dùng ảnh/notes đầy đủ.
Entity JPA luôn ánh xạ notes và bảng ảnh, vì vậy **schema phải đầy đủ ngay khi khởi động**,
kể cả khi flag false. Flag chỉ kiểm soát chức năng, không bỏ qua schema validation.
Giữ `ddl-auto=validate`, `sql.init.mode=never`; Hibernate kiểm tra mapping mà không thay schema.

Frontend `.env.local` (cấu hình thủ công, không chứa secret):

```dotenv
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
Module B luôn dùng API, không còn đọc `VITE_ROOMS_DATA_SOURCE` hoặc lưu dữ liệu mock trên trình duyệt.

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
| POST | `/admin/images` | UC-B1; binary JPG/PNG tối đa 5 MB; 201 `{url}` |
| GET | `/public/images/{name}` | Guest; đọc ảnh đã upload, MIME đúng và `nosniff` |

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

CRUD dùng transaction tại InventoryService và repository Spring Data JPA cùng DataSource hiện có.
Entity dùng tên rõ ràng CatalogRoomType/CatalogRoom/CatalogAmenity/CatalogRoomTypeImage/CatalogRoomImage,
ánh xạ đúng bảng hiện có và không đụng entity HotelRoom/RoomTypeRef/IssueRoom của module khác.
Quan hệ type–amenity dùng ManyToMany qua room_type_amenities; room/type/images dùng ManyToOne LAZY,
không cascade sang bảng của module khác. Amenities được batch fetch bằng EntityGraph, ảnh query theo hotel,
không N+1 hoặc join nhiều bag. Ảnh cũ được xóa/flush trước khi tái dùng sort_order unique.
ID dùng GenerationType.IDENTITY, chỉ identifier được đánh dấu generated trong Hibernate;
row_version và timestamps insert là read-only, không @Generated hoặc @Version.
Metadata test xác nhận SQLServerDialect dùng GetGeneratedKeysDelegate, tránh OUTPUT INSERTED trên bảng có trigger.
Kiểm thử insert/update thực trên SQL Server vẫn cần suite opt-in trên DB riêng.
@Nationalized ánh xạ NVARCHAR; icon/status giữ VARCHAR. Phòng mới refresh sau saveAndFlush để đọc default DB.
operational_status/housekeeping_status có insertable=false, updatable=false, không bị catalog ghi đè.

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

## Upload ảnh loại phòng từ máy

Form loại phòng trong FE API mode có nút chọn một/nhiều ảnh. JPG/PNG, mỗi file tối đa 5 MB,
tổng ảnh có sẵn + ảnh chọn + URL đang nhập tối đa 6. Upload xong hiển thị preview;
**bấm Lưu** để lưu URL vào `inventory.room_type_images`. Không đổi schema và vẫn nhập URL ngoài được.
File nhị phân lưu trên ổ đĩa backend, database chỉ giữ URL. Mặc định:
`${user.home}/.hotel-management/room-images`, nằm ngoài repository và ngoài target.
Khởi động lại backend vẫn đọc được file cũ nếu giữ nguyên thư mục.

Cấu hình tùy chọn trong `.env` backend (Windows dùng dấu `/` trong đường dẫn):

```dotenv
INVENTORY_EXTENSIONS_ENABLED=true
# Không bắt buộc, chỉ thêm khi muốn đổi nơi lưu hoặc URL triển khai:
# INVENTORY_IMAGE_DIRECTORY=D:/HotelManagementData/room-images
# INVENTORY_IMAGE_BASE_URL=http://localhost:8080/api/inventory/public/images
```

Upload gửi **nội dung binary của một file** với Content-Type image/jpeg hoặc image/png,
không dùng multipart; backend đọc stream giới hạn dung lượng, không sửa giới hạn multipart dùng chung.
Ảnh được kiểm tra định dạng thực, kích thước tối đa 20 megapixel/mỗi chiều 8192 px rồi re-encode,
bỏ metadata/nội dung nối thêm. Tên file do server sinh UUID, không dùng tên/path do client gửi.
API trả 400 ảnh hỏng/kích thước pixel quá lớn, 413 quá 5 MB, 415 loại file không hỗ trợ,
401/403 thiếu đăng nhập/quyền, 409 chưa bật chức năng ảnh, 500 lỗi ghi file với message an toàn.
Ảnh public có cache immutable vì mỗi file dùng URL riêng. Không chấp nhận SVG/HTML.

Xóa ảnh trên form chỉ gỡ liên kết khi Lưu; không tự xóa file vì URL có thể đang được dùng nơi khác.
File upload nhưng hủy form có thể chưa có liên kết DB, cần quản lý dung lượng/backup thư mục lưu ảnh
theo môi trường chạy. Chưa có job tự xóa file hoặc cloud storage; không lưu binary trong Git hay SQL Server.

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
Module C có adapter mock/API riêng, chọn bằng `VITE_BOOKING_DATA_SOURCE`; handoff từ B không tự bật API C.
Không sửa Module C trong thay đổi này.

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

SQL integration có fixture chỉ chạy với DB **riêng**, tên kết thúc `_inventory_test`, đã có schema/procedure/migration.
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

Kiểm tra riêng JPA metadata + các query không cần DB: `InventoryJpaMappingTests`.
Kiểm tra JPA mapping và thay đổi entity/DTO với repository mock: `InventoryJpaRepositoryTests`.
Đối chiếu **chỉ đọc** trên DB local từ `.env` có thể chạy riêng:

```powershell
.\mvnw.cmd '-Dtest=InventoryJpaSchemaTests' '-Dinventory.verify-local-schema=true' test
```

Test này dùng Hibernate validate, so sánh procedure local với DDL SELECT-only đã review trước khi gọi;
không tạo fixture/hold/booking, không thay dữ liệu. Mặc định skip nếu không bật rõ property.

Test upload/file storage/phân quyền và FE adapter:

```powershell
.\mvnw.cmd '-Dtest=Inventory*Tests,RoomImageStorageTests' test
# Trong thư mục FE:
node --test src/modules/rooms/tests/*.test.mjs
```
