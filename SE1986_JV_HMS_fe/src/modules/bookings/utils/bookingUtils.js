export const BOOKING_STATUS = {
  PENDING: { label: 'Chờ thanh toán', className: 'is-pending' },
  DEPOSITED: { label: 'Đã đặt cọc', className: 'is-confirmed' },
  CONFIRMED: { label: 'Đã xác nhận', className: 'is-confirmed' },
  CHECKED_IN: { label: 'Đang lưu trú', className: 'is-checked-in' },
  COMPLETED: { label: 'Đã hoàn tất', className: 'is-completed' },
  CHECKED_OUT: { label: 'Đã trả phòng', className: 'is-completed' },
  CANCELLED: { label: 'Đã hủy', className: 'is-cancelled' },
  EXPIRED: { label: 'Hết hạn giữ chỗ', className: 'is-expired' },
};

// Nhóm trạng thái theo UC-2.6 View Booking History (Upcoming / Current / Past / Cancelled).
export const BOOKING_GROUPS = [
  { key: 'UPCOMING', label: 'Sắp tới', hint: 'Đã đặt, chưa tới ngày nhận phòng' },
  { key: 'CURRENT', label: 'Đang lưu trú', hint: 'Đang trong thời gian lưu trú' },
  { key: 'PAST', label: 'Đã qua', hint: 'Đã trả phòng hoặc hoàn tất' },
  { key: 'CANCELLED', label: 'Đã hủy', hint: 'Đã hủy hoặc hết hạn giữ chỗ' },
];

const CANCELLED_STATUSES = ['CANCELLED', 'EXPIRED'];
const PAST_STATUSES = ['COMPLETED', 'CHECKED_OUT'];

/**
 * Xếp một booking vào nhóm hiển thị. Trạng thái trong DB là nguồn chính; với
 * booking đã xác nhận nhưng hôm nay nằm trong khoảng lưu trú thì coi là đang ở.
 */
export const bookingGroup = (booking) => {
  const status = booking?.status;
  if (CANCELLED_STATUSES.includes(status)) return 'CANCELLED';
  if (PAST_STATUSES.includes(status)) return 'PAST';
  if (status === 'CHECKED_IN') return 'CURRENT';

  const checkIn = booking?.checkIn;
  const checkOut = booking?.checkOut;
  const currentDay = today();
  if (checkIn && checkOut && checkIn <= currentDay && currentDay < checkOut) {
    return 'CURRENT';
  }
  return 'UPCOMING';
};

/**
 * BR-CAN-03: booking đã check-in hoặc đã hoàn tất không được hủy. Chỉ PENDING,
 * DEPOSITED (CONFIRMED) mới hủy được.
 */
export const canCancelBooking = (booking) =>
  ['PENDING', 'DEPOSITED', 'CONFIRMED'].includes(booking?.status);

export const isDepositSettled = (booking) =>
  Number(booking?.depositRequired || 0) > 0 &&
  Number(booking?.depositPaid || 0) >= Number(booking?.depositRequired || 0);

// Thời gian giữ phòng của booking PENDING (khớp backend `booking.hold-minutes`).
export const HOLD_MINUTES = 15;

// Các phiên bản API cũ trả UTC mà không kèm hậu tố múi giờ.
const parseHoldExpiry = (value) =>
  Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + 'Z');

/** Số giây còn lại để thanh toán cọc; null nếu booking không có hạn giữ chỗ. */
export const holdRemainingSeconds = (booking) => {
  if (!booking?.holdExpiresAt) return null;
  const expiresAt = parseHoldExpiry(booking.holdExpiresAt);
  if (Number.isNaN(expiresAt)) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
};

/** Đếm ngược dạng m:ss. */
export const formatHoldTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const isHoldExpired = (booking) => {
  if (!booking?.holdExpiresAt) return false;
  const expiresAt = parseHoldExpiry(booking.holdExpiresAt);
  return !Number.isNaN(expiresAt) && expiresAt <= Date.now();
};

export const money = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000,
  );
  return Number.isFinite(nights) ? nights : 0;
};

export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const displayDate = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));

export const displayDateTime = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

export const roomBookingUrl = (params) => {
  const query = new URLSearchParams();
  ['roomTypeId', 'checkIn', 'checkOut', 'guests', 'roomCount'].forEach((key) => {
    const value = params.get(key);
    if (value) query.set(key, value);
  });
  return `/bookings/new?${query.toString()}`;
};
