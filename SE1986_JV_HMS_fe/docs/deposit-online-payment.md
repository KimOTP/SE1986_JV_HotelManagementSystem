# UC-2.5 — Thanh toán tiền cọc trực tuyến (Deposit Payment)

Tài liệu thiết kế màn `Đặt phòng → Thanh toán tiền cọc`, cập nhật theo định hướng
**Digital-First** của dự án: khách đặt và trả cọc **hoàn toàn online**, không có
phương thức tiền mặt tại quầy trong luồng đặt phòng.

## 1. Bối cảnh & mục tiêu

- SRS UC-2.5: sau khi tạo booking `PENDING`, khách thanh toán cọc qua **cổng
  thanh toán trực tuyến**, booking chuyển `DEPOSITED` (trong DB hiện tại là
  `CONFIRMED`).
- BR-BK-01 (Digital-First): mọi đặt phòng đi qua web/kiosk, không thu tiền mặt
  cho booking online.
- Mục tiêu UI: một màn hình rõ ràng — *đang trả cho đơn nào, bao nhiêu, bằng
  kênh nào, nhận được gì sau khi trả*.

## 2. Hiện trạng → Thiết kế mới

| Hạng mục | Trước | Sau |
| --- | --- | --- |
| Bố cục | 2 cột Bootstrap card, form select thô | 2 cột: **Thông tin đặt phòng** (trái) và **Phương thức thanh toán** (phải), card bo 14px theo design system HMS |
| Phương thức | Dropdown gồm `Chuyển khoản`, `Thẻ tín dụng`, **`Tiền mặt tại quầy`** | 3 thẻ chọn trực tuyến: **Chuyển khoản / QR**, **Thẻ quốc tế**, **Ví điện tử** — bỏ hoàn toàn tiền mặt |
| Số tiền | Chỉ hiện "Cần thanh toán" | Bảng breakdown: tổng tiền · cọc 30% · còn lại khi nhận phòng · **Thanh toán hôm nay** nổi bật |
| Trạng thái sau trả | Alert text | Màn hình thành công: mã đơn, số tiền, kênh thanh toán, CTA xem đơn / danh sách |
| Đơn không có | Text "Không có đặt phòng nào…" | Empty state có icon + CTA tạo đặt phòng |
| Nhãn | "thanh toán demo" | Badge **Trực tuyến** + ghi chú rõ môi trường demo chưa nối cổng thanh toán |

## 3. Phương thức thanh toán

| Mã nội bộ | Nhãn UI | Mô tả | Ghi chú |
| --- | --- | --- | --- |
| `BANK_TRANSFER` | Chuyển khoản / QR ngân hàng | Quét QR hoặc chuyển khoản, cổng xác nhận tự động | Mặc định, gắn tag **Khuyến nghị** |
| `CREDIT_CARD` | Thẻ quốc tế | Visa, Mastercard, JCB | Thanh toán ngay |
| `E_WALLET` | Ví điện tử | MoMo, ZaloPay, VNPay | Mở app xác nhận |

`CASH` bị **loại khỏi cả UI và validation mock** (`bookingStore.payBookingDeposit`).
Hóa đơn tại quầy (Module D) không còn thu tiền mặt: khoản còn phải trả được thanh toán bằng chuyển khoản QR payOS (`/frontdesk/invoices/{số}`), cùng cơ chế với đặt cọc.

## 4. Quy tắc nghiệp vụ

- Chỉ thanh toán được đơn `PENDING`; đơn khác không nằm trong danh sách chọn.
- Số tiền cọc = `depositRequired` của booking (30% tổng tiền, backend tính).
- Sau khi thanh toán: `depositPaid = depositRequired`, trạng thái → `CONFIRMED`,
  timeline thêm mốc "Đã thanh toán tiền cọc".
- Phần còn lại (`totalAmount − depositRequired`) hiển thị là "thanh toán khi nhận
  phòng", không thu ở bước này.
- BR-CAN-01: nếu khách hủy sau khi đã cọc, cọc **không hoàn** — màn hủy
  (`CancelBookingPage`) hiển thị cảnh báo; màn cọc chỉ nhắc bằng ghi chú ngắn.
- Quyền: cần `UC-C2`; thiếu quyền thì nút bị disable và báo lỗi rõ ràng.

## 5. Trạng thái màn hình

| Trạng thái | Nội dung |
| --- | --- |
| Có đơn chờ + đã chọn đơn | Breakdown tiền + 3 phương thức + nút `Thanh toán {số tiền}` |
| Chưa chọn đơn | Nút disable, nhắc "Chọn một đặt phòng để xem số tiền cọc" |
| Đang xử lý | Nút `Đang xử lý giao dịch…`, disable |
| Thành công | Panel xanh: mã đơn, số tiền, kênh đã dùng, 2 CTA |
| Không có đơn `PENDING` | Empty state + CTA tạo đặt phòng |
| Lỗi | `BookingError` phía trên (ví dụ thiếu quyền, đơn không hợp lệ) |

## 6. Responsive & accessibility

- ≥ 992px: 2 cột; < 992px: xếp dọc (thông tin đơn trước, phương thức sau).
- < 576px: nhãn/giá trị trong bảng thông tin xếp dọc, ẩn tag "Khuyến nghị" để
  tránh chật; nút CTA full width.
- Phương thức là `role="radiogroup"` + `role="radio"` + `aria-checked`, có thể
  chọn bằng bàn phím (button).
- Trạng thái không chỉ dựa vào màu: có nhãn chữ + icon.

## 7. Acceptance criteria

1. **AC1** — Không còn lựa chọn "Tiền mặt tại quầy" ở bất kỳ đâu trên màn cọc.
2. **AC2** — Vào `/bookings/deposit?bookingId=BK-2601`: hiển thị đúng mã đơn,
   loại phòng, ngày, số khách, tổng tiền, cọc 30%, còn lại và "Thanh toán hôm nay".
3. **AC3** — Chọn từng phương thức: thẻ được chọn có viền xanh + radio đậm; nút
   CTA giữ đúng số tiền.
4. **AC4** — Bấm thanh toán: nút chuyển "Đang xử lý…", sau đó hiện màn thành
   công kèm mã đơn, số tiền và kênh thanh toán.
5. **AC5** — Sau khi thanh toán, quay lại *Đặt phòng của tôi*: đơn chuyển
   "Đã xác nhận", cọc hiển thị "đã thu".
6. **AC6** — Tài khoản không có `UC-C2`: nút disable + thông báo lỗi khi bấm.

## 8. Tích hợp backend (đã có endpoint)

Backend Module C đã triển khai `POST /api/bookings/{bookingCode}/deposit` — quyền `UC-C2`,
chỉ chủ booking:

| Việc | Chi tiết |
| --- | --- |
| Body | `{ "method": "BANK_TRANSFER" \| "CREDIT_CARD" \| "E_WALLET" }` |
| Xử lý | Khóa booking, ghi `billing.payment_transactions` (`DEPOSIT`/`SUCCESS`), chuyển `PENDING → CONFIRMED`, ghi history — cùng một transaction |
| Mapping method | `BANK_TRANSFER → BANK_TRANSFER`; `CREDIT_CARD`, `E_WALLET → GATEWAY` (enum DB) |
| Lỗi | `409 BOOKING_NOT_PAYABLE`, `409 BOOKING_HOLD_EXPIRED`, `409 BOOKING_PAYMENT_CONFLICT`, `400 BOOKING_PAYMENT_METHOD_INVALID` |
| Việc còn lại ở FE | Thay `payBookingDeposit` mock bằng gọi API và map `code` lỗi sang thông báo; `depositPaid` lấy từ response thay vì store |

Chi tiết đầy đủ ở `SE1986_JV_HMS_be/docs/module-c-booking-api.md` mục 11.4.

## 9. Giữ phòng 15 phút & nhả phòng

- Booking mới ở `PENDING` được giữ phòng **15 phút** (`booking.hold-minutes`), hạn giữ
  chỗ trả về trong `holdExpiresAt`.
- Hết hạn, phòng **được nhả ngay** cho khách khác: procedure tìm phòng chỉ coi booking
  `PENDING` là đang chiếm phòng khi `hold_expires_at` còn hiệu lực. Job backend
  (`BookingHoldExpiryJob`) chạy mỗi ~60s để chuyển `PENDING → EXPIRED` và ghi lịch sử.
- UI tương ứng:
  - **Chi tiết đơn**: banner đếm ngược "Giữ phòng còn 14:59" + hạn thanh toán; về 0 tự
    đổi "Đã hết hạn giữ chỗ", ẩn nút thanh toán/hủy.
  - **Đặt phòng của tôi**: dòng `PENDING` hiện "Còn m:ss để thanh toán cọc"; hết hạn
    chuyển badge "Hết hạn giữ chỗ" (nhóm Đã hủy), không còn nút thanh toán.
  - **Thanh toán cọc**: đơn hết hạn không nằm trong danh sách chờ; vào trực tiếp thì
    nút thanh toán bị vô hiệu kèm cảnh báo.
- Mock FE mô phỏng đúng 15 phút: `HOLD_MINUTES` trong `bookingUtils`, store tự đánh dấu
  `EXPIRED` khi đọc dữ liệu đã quá hạn.
