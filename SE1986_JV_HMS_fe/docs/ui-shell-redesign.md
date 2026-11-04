# Thiết kế lại Header – Sidebar – Footer (HMS shell)

Tài liệu bàn giao cho phần "khung ứng dụng" của FE, thực hiện theo mockup được
cung cấp (khách hàng đã đăng nhập, màn hình *Đặt phòng của tôi*).

## 1. Mục tiêu

- Thay khung Bootstrap mặc định (`navbar dark` + `aside bg-light` + footer một
  dòng) bằng một shell đồng nhất: header navy, sidebar trắng có promo card,
  footer navy nhiều cột kiểu Traveloka.
- Giữ nguyên toàn bộ route, phân quyền UC và logic nghiệp vụ hiện có.
- Bổ sung 2 đích đến còn thiếu để menu header không trỏ vào route 404.

## 2. Hiện trạng → Thiết kế mới

| Khu vực | Trước | Sau |
| --- | --- | --- |
| Header | `Navbar bg="dark"`, chỉ có brand + nút phụ | 60px, logo + user menu (avatar, tên, dropdown), nút Đăng xuất; không còn nav |
| Sidebar | `bg-light`, nhóm chữ hoa (HOUSEKEEPING, BOOKINGS…), active = `bg-primary` | 232px, item có icon, nhóm phân tách bằng divider, active = pill xanh nhạt, promo card ở đáy |
| Footer | `bg-dark` chữ căn giữa, chỉ 1 dòng | Footer nhiều cột: brand + 3 cột link + dải copyright, cao ~337px |
| Shell | `min-vh-100` + `Container fluid`, cả trang cuộn | `100vh` flex: header cố định, sidebar cố định, vùng `main + footer` cuộn chung |

## 3. Kiến trúc thông tin (IA)

**Header (không còn điều hướng cấp 1)**

Header chỉ gồm logo (trái) và cụm người dùng/Đăng xuất (phải). Bốn mục
*Trang chủ · Đặt phòng · Dịch vụ · Liên hệ* đã được bỏ theo yêu cầu; mọi điều
hướng chức năng nằm ở sidebar, riêng `/rooms` (tìm phòng) hiện chỉ vào được bằng
URL trực tiếp — xem mục 9.

**Sidebar (6 nhóm, lọc theo mã UC)**

1. Dịch vụ & phản hồi — Dịch vụ & phản hồi (`/services`), Báo cáo sự cố (UC-E4), Đánh giá & phản hồi (UC-E6)
2. Đặt phòng — tiêu đề nhóm **"Đặt phòng" là nhãn tĩnh, không bấm được**; các mục bên dưới: Tạo đặt phòng (UC-C1), Đặt phòng của tôi (UC-C3), Thanh toán tiền cọc (UC-C2), Quản lý đặt phòng (UC-C5)
3. Buồng phòng — Tổng quan (UC-E3), Bảng công việc (UC-E1), Công việc của tôi (UC-E2)
4. Lễ tân — Check-in (UC-D1), Check-out (UC-D2), Hóa đơn (UC-D6)
5. Danh mục phòng — Loại phòng (UC-B1), Phòng (UC-B2), Tiện nghi (UC-B3), Sơ đồ phòng (UC-B6)
6. Hệ thống — Người dùng (UC-A5), Vai trò & quyền (UC-A6)

Vai trò CUSTOMER chỉ thấy nhóm 1 và 2, đúng như mockup. Lối vào `/rooms` (tìm
phòng) là nút "Tìm phòng" ở tiêu đề trang *Đặt phòng của tôi* (mục 9).

## 4. Design token

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--hms-navy` | `#0a2540` | header, footer |
| `--hms-blue` | `#1a73e8` | active, CTA, icon nhấn |
| `--hms-blue-soft` | `#e8f0fe` | nền item active, icon badge |
| `--hms-ink` | `#1f3350` | tiêu đề, chữ chính |
| `--hms-muted` | `#66788f` | mô tả, caption |
| `--hms-border` | `#e3e9f2` | divider, viền card |
| `--hms-page` | `#f5f7fb` | nền vùng nội dung |
| `--hms-gold` | `#f2c14e` | cờ logo, đèn toà nhà trong ảnh promo |
| `--hms-header-h` | `60px` | chiều cao header |
| `--hms-sidebar-w` | `232px` | bề rộng sidebar |

Typography: system UI stack (`Segoe UI`, Roboto), item sidebar 13.7px, caption
promo 11.5px, footer 13.6px (link) / 12.5px (dải copyright). Không nạp webfont
để giữ tốc độ và tránh phụ thuộc mạng.

## 5. Đặc tả component

**Header** (`app/layouts/components/Header.jsx`)

- Cao 60px, nền navy, sticky theo shell (không dùng `position: fixed`).
- Trái: nút hamburger (<992px) + logo SVG + tên "Hotel Management System".
- Không còn thanh nav 4 mục (đã bỏ theo yêu cầu).
- Phải: avatar chữ cái đầu (34px, gradient xanh) + tên + `Dropdown` (Hồ sơ cá nhân,
  Đăng xuất) + vạch dọc + nút Đăng xuất.
- Chưa đăng nhập: hiện nút "Đăng nhập" thay cụm user.

**Sidebar** (`app/layouts/components/Sidebar.jsx`)

- Rộng 232px, nền trắng, viền phải 1px, tự cuộn khi menu dài.
- Item: icon 17px + nhãn, padding 9/11px, bo 9px; hover nền `#f2f6fc`.
- Tiêu đề nhóm (`h2.hms-sidebar__heading`): icon + nhãn, chữ nhỏ hơn (12.5px),
  màu `--hms-muted`, `cursor: default`, không hover/focus — dùng cho nhãn
  "Đặt phòng" nên không bấm được và không nằm trong tab order.
- Active: nền `--hms-blue-soft`, chữ + icon xanh đậm, `font-weight 600`; xác định
  theo đường dẫn khớp dài nhất để `/bookings` và `/bookings/new` không cùng sáng.
- Divider 1px giữa các nhóm; nhãn nhóm chỉ dành cho screen reader (`aria-label`).
- Đáy: ảnh minh hoạ SVG (chỉ ảnh, không còn caption), dùng `margin-top: auto`
  để luôn bám đáy sidebar.

**Footer** (`app/layouts/components/Footer.jsx`)

- Nền navy, chia 2 tầng: `.hms-footer__main` (brand + 3 cột link) và
  `.hms-footer__bottom` (dải copyright có border-top).
- Cột trái: logo + tên hệ thống, tagline, 3 badge (`SWD392-G3`,
  `FPT University`, `HMS 2026`), 3 icon social.
- 3 cột link: *Đặt phòng*, *Dịch vụ*, *Khác* — giống bố cục Traveloka; mỗi link
  có `permission` (UC) nên tài khoản không đủ quyền sẽ không thấy link đó.
- Dải dưới: `© <năm> Hotel Management System. All rights reserved.` bên trái,
  `SWD392-G3 · FPT University` bên phải.
- Bề rộng nội dung giới hạn `max-width: 1200px`, padding 1.5rem.

**Trang mới**

- `/services` — danh sách 6 dịch vụ (đưa đón, spa, ẩm thực, giặt ủi, hồ bơi,
  tour) + khối CTA dẫn sang báo cáo sự cố / đánh giá.
- `/contact` — thông tin khách sạn + form liên hệ (validate HTML5, hiển thị
  thông báo sau khi gửi). Chưa nối backend nên thông báo ghi rõ là demo.

## 6. Hành vi responsive

| Breakpoint | Hành vi |
| --- | --- |
| ≥ 992px | Sidebar cố định bên trái; footer 2 cột lớn (brand + 3 cột link) |
| < 992px | Sidebar ẩn, mở bằng hamburger trong `Offcanvas` (rộng 232px, tự đóng khi chọn mục); footer xếp dọc, link chia 3 cột đều |
| < 576px | Tên user và chữ "Đăng xuất" thu gọn, brand rút gọn bằng ellipsis; link footer chia 2 cột, dải copyright căn giữa |

Vùng `.hms-scroll` (main + footer) tự cuộn nên header và sidebar luôn đứng yên;
footer chỉ xuất hiện khi cuộn hết nội dung.

## 7. Phân quyền & dữ liệu

- Menu sidebar lẫn link footer đều lọc bằng `hasPermission` theo mã UC, không đổi
  nguồn quyền.
- `/services` và `/contact` nằm trong `ProtectedRoute` (cần đăng nhập) nhưng
  không yêu cầu UC riêng.
- Không phát sinh gọi API mới; dữ liệu trang mới là tĩnh/demo.

## 8. Accessibility

- `aria-current="page"` cho mục đang chọn (header + sidebar).
- `aria-label` cho nav, social link, nút hamburger; icon trang trí có `aria-hidden`.
- Focus-visible dùng nền sáng hơn thay vì bỏ outline mặc định.
- Tương phản: chữ trắng trên navy `#0a2540` đạt ~14:1; chữ `#3d4f68` trên trắng
  đạt ~8:1; trạng thái active dùng chữ xanh đậm trên nền xanh nhạt ~4.8:1.

## 9. Ghi chú & rủi ro

- **Lối vào `/rooms` (tìm phòng)**: đặt nút "Tìm phòng" (outline) cạnh nút "Tạo đặt
  phòng" ở tiêu đề trang *Đặt phòng của tôi*; chỉ hiện với tài khoản có `UC-B4`.
  Đây là điểm vào duy nhất sau khi bỏ nav header và biến "Đặt phòng" ở sidebar
  thành nhãn tĩnh.
- Ảnh promo và logo là SVG nội bộ (`src/assets/images/`), không phụ thuộc ảnh
  stock/URL ngoài; skyline cũ đã bỏ cùng footer một dòng.
- Avatar dùng chữ cái đầu thay vì ảnh đại diện vì mock user chưa có `avatarUrl`.
- Badge trong footer (`SWD392-G3`, `FPT University`, `HMS 2026`) là nhãn dự án,
  không phải chứng nhận thật; thay bằng logo đối tác/chứng nhận khi có.

## 10. Kiểm chứng

```bash
cd SE1986_JV_HMS_fe
npm install
npm run lint   # 0 lỗi
npm run build  # build thành công
```

Ảnh chụp giao diện sau khi dựng: `docs/ui-redesign/`.
