import { BLOCKING_RESERVATION_STATUSES, FALLBACK_IMAGE } from '../constants/roomConstants.js';

export const clone = (value) => JSON.parse(JSON.stringify(value));
export const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('vi');
export const currency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
export const imageOrFallback = (images) => images?.[0] || FALLBACK_IMAGE;
export const localDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
export const parseLocalDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? new Date(`${value}T00:00:00`) : null;
export const nightsBetween = (a, b) => {
  const start = parseLocalDate(a);
  const end = parseLocalDate(b);
  return start && end ? Math.round((end - start) / 86400000) : 0;
};
export const overlaps = (aIn, aOut, bIn, bOut) => aIn < bOut && aOut > bIn;
export const reservationBlocks = (reservation, checkIn, checkOut) =>
  BLOCKING_RESERVATION_STATUSES.includes(reservation.status) &&
  overlaps(reservation.checkIn, reservation.checkOut, checkIn, checkOut);
export const validateSearch = ({ checkIn, checkOut, guests }, today = localDateString()) => {
  const errors = {};
  const count = Number(guests);
  if (!parseLocalDate(checkIn)) errors.checkIn = 'Vui lòng chọn ngày nhận phòng hợp lệ.';
  else if (checkIn < today) errors.checkIn = 'Ngày nhận phòng không được trước hôm nay.';
  if (!parseLocalDate(checkOut)) errors.checkOut = 'Vui lòng chọn ngày trả phòng hợp lệ.';
  else if (checkIn && checkOut <= checkIn)
    errors.checkOut = 'Ngày trả phòng phải sau ngày nhận phòng.';
  if (!Number.isInteger(count) || count < 1) errors.guests = 'Số khách phải là số nguyên từ 1.';
  return errors;
};
