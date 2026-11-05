# UC-2.6 — Thiết kế lại màn "Đặt phòng của tôi" (Booking History)

Tài liệu bàn giao cho Module C (Booking & Reservation) — vai trò BA + DEV.
Bám theo SRS `UC-2.6 View Booking History` và design system HMS đang dùng cho
toàn bộ giao diện (header navy, sidebar trắng, card bo 14px, token `--hms-*`).

## 1. Mục tiêu

- Khách đăng nhập xem được **toàn bộ** đặt phòng của mình: sắp tới, đang ở, đã
  qua, đã hủy — kèm tóm tắt số lượng theo từng nhóm.
- Trả lời nhanh 3 câu hỏi của khách: *đơn nào sắp tới?*, *còn nợ bao nhiêu cọc?*,
  *tôi có thể hủy/thanh toán không?*
- Đồng bộ ngôn ngữ hình ảnh với các màn còn lại (Services, Contact, Bookings…),
  thay bảng Bootstrap cũ vốn lệch style.

## 2. Hiện trạng → Thiết kế mới

| Hạng mục | Trước | Sau |
| --- | --- | --- |
| Tiêu đề | `PageHeading` riêng của module | `hms-page-head` (icon + title + desc) dùng chung |
| Lọc | 1 dropdown trạng thái thô | 5 thẻ tóm tắt bấm được (Tất cả / Sắp tới / Đang lưu trú / Đã qua / Đã hủy) kèm số lượng |
| Tìm kiếm | Không có | Tìm theo **mã đặt phòng**, có nút xóa bộ lọc |
| Danh sách | Bảng 6–7 cột, chen chúc trên mobile | Card list: mã đơn + loại phòng, ngày lưu trú, tổng tiền + cọc, trạng thái, hành động |
| Hành động | Chỉ "Chi tiết" | Thanh toán cọc (khi PENDING), Chi tiết, Hủy (khi được phép) |
| Trạng thái rỗng | 1 dòng "Chưa có đặt phòng phù hợp" | Empty state có icon + 2 ngữ cảnh (chưa có đơn / không khớp bộ lọc) + CTA Tìm phòng |
| Phân trang | Không | 5 đơn/trang, hiện khi > 1 trang |
| Deep link | Không | Bộ lọc lưu trên URL `?status=PAST`, reload vẫn giữ |

## 3. Cấu trúc màn hình

```
┌ Page head ──────────────────────────────────────────────┐
│ [icon] Đặt phòng của tôi            [Tìm phòng] [Tạo đặt phòng]
│        Theo dõi trạng thái và lịch sử…
├ Demo note (chỉ customer) ──────────────────────────────┤
│ Dữ liệu demo… (thay bằng banner lỗi/offline khi nối API) │
├ 5 thẻ tóm tắt (bấm để lọc) ────────────────────────────┤
│ [Tất cả 3] [Sắp tới 2] [Đang lưu trú 0] [Đã qua 1] [Đã hủy 0]
├ Toolbar ────────────────────────────────────────────────┤
│ [🔍 Tìm theo mã đặt phòng]  [Xóa bộ lọc]   3 đặt phòng  [↻ Tải lại]
├ Danh sách ──────────────────────────────────────────────┤
│ [🚪] BK-2601            📅 09/11 – 12/11    2.850.000 ₫   [Chờ thanh toán]
│      Deluxe · 1 phòng   3 đêm · 2 khách     Cọc 855.000 ₫  [Thanh toán cọc][Chi tiết][Hủy]
└─────────────────────────────────────────────────────────┘
```

Thẻ tóm tắt vừa là **thống kê** vừa là **bộ lọc** (giống dashboard), tránh lặp
lại một hàng tab riêng. Nhóm "Đã hủy" gộp cả `EXPIRED` (hết hạn giữ chỗ).

## 4. Ánh xạ trạng thái

| Nguồn | Giá trị | Nhãn hiển thị | Nhóm |
| --- | --- | --- | --- |
| Mock FE + DB | `PENDING` | Chờ thanh toán | Sắp tới |
| SRS "DEPOSITED", DB `CONFIRMED` | `DEPOSITED` / `CONFIRMED` | Đã đặt cọc / Đã xác nhận | Sắp tới |
| DB | `CHECKED_IN` | Đang lưu trú | Đang lưu trú |
| Mock FE | `COMPLETED` | Đã hoàn tất | Đã qua |
| DB | `CHECKED_OUT` | Đã trả phòng | Đã qua |
| Cả hai | `CANCELLED` | Đã hủy | Đã hủy |
| DB | `EXPIRED` | Hết hạn giữ chỗ | Đã hủy |

`bookingGroup()` ưu tiên trạng thái; riêng đơn chưa check-in nhưng hôm nay nằm
trong `[checkIn, checkOut)` thì xếp vào *Đang lưu trú*.

## 5. Quy tắc nghiệp vụ áp lên UI

| Quy tắc | Cách thể hiện |
| --- | --- |
| BR-CAN-03: không hủy đơn `CHECKED_IN`/`COMPLETED` | Nút **Hủy** chỉ render khi `canCancelBooking()` = `PENDING`/`DEPOSITED`/`CONFIRMED` |
| BR-CAN-01: hủy đơn đã cọc là **mất cọc** | Nút Hủy dẫn sang `CancelBookingPage`, nơi hiển thị cảnh báo no-refund (giữ nguyên, không nhân bản ở danh sách) |
| UC-2.5: đơn `PENDING` cần thanh toán cọc | Nút **Thanh toán cọc** → `/bookings/deposit?bookingId=…`, có badge "chưa thu" dưới tổng tiền |
| BR-ADM-02 / role-based | Nút hiển thị theo quyền: `UC-C2` (cọc), `UC-C4` (hủy), `UC-B4` (tìm phòng), `UC-C1` (tạo đơn) |
| UC-2.7 chi tiết | Mọi dòng đều có **Chi tiết** → `/bookings/:id` |

## 6. Trạng thái màn hình

| Trạng thái | Xử lý |
| --- | --- |
| Có dữ liệu | Card list + đếm kết quả, phân trang 5 đơn/trang |
| Không có đơn nào | Empty state "Chưa có đặt phòng nào" + CTA Tìm phòng |
| Bộ lọc/tìm kiếm không khớp | Empty state "Không có đặt phòng trong nhóm này" / "Không tìm thấy đặt phòng" + Xóa bộ lọc |
| Lỗi tải dữ liệu (khi nối API) | Thay demo note bằng alert lỗi + nút Thử lại (dùng chung `bh-demo-note` style) |

## 7. Responsive

| Breakpoint | Hành vi |
| --- | --- |
| ≥ 1200px | 5 thẻ tóm tắt 1 hàng; card 4 cột (thông tin · ngày · tiền · trạng thái/actions) |
| 992–1199px | Thẻ tóm tắt 3 cột; card giữ 4 cột |
| < 992px | Thẻ tóm tắt 2 cột; card 2 cột, hàng trạng thái + hành động xuống dưới |
| < 576px | Thẻ tóm tắt cuộn ngang (snap), card 1 cột, nút hành động xếp trái |

## 8. Accessibility

- Thẻ tóm tắt là `<button>` có `aria-pressed`, nhóm có `aria-label`.
- Ô tìm kiếm có `aria-label`; số kết quả dùng `aria-live="polite"`.
- Trạng thái là text + màu (không chỉ màu), có nhãn tiếng Việt.
- Danh sách dùng `ul/li`; icon trang trí `aria-hidden`.
- Focus-visible giữ mặc định của Bootstrap + viền xanh ở thẻ đang chọn.

## 9. Acceptance criteria (UC-2.6)

1. **AC1** — Mở `/bookings` khi đã đăng nhập: thấy 5 thẻ tóm tắt, số lượng bằng
   số đơn của tôi theo từng nhóm; tổng "Tất cả" = tổng các nhóm.
2. **AC2** — Danh sách hiển thị đúng 5 thông tin SRS yêu cầu: mã đặt phòng, loại
   phòng, ngày lưu trú, trạng thái, tổng tiền.
3. **AC3** — Bấm thẻ "Đã qua": chỉ còn đơn thuộc nhóm đó, URL thành
   `?status=PAST`, tải lại trang vẫn giữ bộ lọc.
4. **AC4** — Gõ `BK-2601` vào ô tìm kiếm: chỉ còn đơn mã tương ứng; gõ mã không
   tồn tại → empty state "Không tìm thấy đặt phòng" + nút Xóa bộ lọc.
5. **AC5** — Đơn `PENDING` hiện nút "Thanh toán cọc" và "Hủy"; đơn `COMPLETED`
   chỉ hiện "Chi tiết" (không có Hủy — BR-CAN-03).
6. **AC6** — Khách không có đơn nào: empty state "Chưa có đặt phòng nào" + CTA
   Tìm phòng.
7. **AC7** — Mobile 390px: không tràn ngang, thẻ tóm tắt cuộn ngang được, các nút
   hành động bấm được (≥ 32px chiều cao).
8. **AC8** — Người dùng thiếu quyền không thấy nút tương ứng (VD: không có
   `UC-C4` thì không có Hủy).

## 10. Kế hoạch nối API backend (Module C đã có sẵn)

| UI hiện tại (mock) | Khi nối backend |
| --- | --- |
| `getBookings()` localStorage | `GET /api/bookings?page&size&status` (UC-C3) |
| Lọc + tìm kiếm + phân trang phía client | Đẩy `status`, `page`, `size` xuống server; tìm theo mã làm phía client hoặc bổ sung `q` |
| `BookingStatus` map | Map `CHECKED_OUT → COMPLETED` nếu giữ nhãn cũ, hoặc dùng nhãn mới |
| Nút Hủy (link trang xác nhận) | `POST /api/bookings/{code}/cancel` với `{ reason }` |
| Demo note | Banner lỗi/offline + nút Thử lại |

Ghi chú: backend trả `rooms`, `depositPaid`, `assignedRooms` — UI đã có chỗ hiển
thị (`rooms`, "đã thu/chưa thu"), nên khi nối API không phải đổi layout.

## 11. Kiểm chứng

- `npm run lint` sạch.
- Ảnh chụp: `docs/booking-history/` (desktop, bộ lọc, empty state, mobile 390px).
- DOM check trên dev server: 5 thẻ tóm tắt `[3,2,0,1,0]`, 3 card đơn đúng mã /
  trạng thái / hành động; bấm "Đã qua" → URL `?status=PAST`, còn 1 đơn.
