export const BOOKING_STATUS = {
  PENDING: { label: 'Chờ thanh toán', className: 'is-pending' },
  CONFIRMED: { label: 'Đã xác nhận', className: 'is-confirmed' },
  CANCELLED: { label: 'Đã hủy', className: 'is-cancelled' },
  COMPLETED: { label: 'Đã hoàn tất', className: 'is-completed' },
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
