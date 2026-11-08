import {
  DEMO_BOOKING_CUSTOMER_KEY,
  cancelBooking,
  createBooking,
  getBooking,
  getBookings,
  payBookingDeposit,
} from '../mocks/bookingStore';

/**
 * Adapter async quanh mock localStorage, cùng contract với bookingsHttpRepository
 * để các trang không cần biết dữ liệu đến từ đâu.
 */
const toView = (booking) => {
  if (!booking) return null;
  return {
    ...booking,
    id: booking.id,
    bookingCode: booking.bookingCode || booking.id,
    rooms: Number(booking.rooms || 1),
    guests: Number(booking.guests || 1),
    depositPaid: Number(booking.depositPaid || 0),
    depositRequired: Number(booking.depositRequired || 0),
    totalAmount: Number(booking.totalAmount || 0),
    timeline: booking.timeline || [
      { status: 'PENDING', label: 'Đặt phòng được tạo', at: booking.createdAt },
    ],
  };
};

const matchesStatus = (booking, status) => !status || booking.status === status;

const matchesKeyword = (booking, keyword) => {
  if (!keyword) return true;
  const text = [booking.id, booking.customerName, booking.email, booking.phone]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi');
  return text.includes(keyword.toLocaleLowerCase('vi'));
};

const sortNewestFirst = (first, second) =>
  String(second.createdAt || '').localeCompare(String(first.createdAt || ''));

const pageOf = (items, page, size) => items.slice(page * size, page * size + size);

export const bookingsMockRepository = {
  async listMine({ status = '', page = 0, size = 20 } = {}) {
    const items = getBookings()
      .filter((booking) => booking.customerKey === DEMO_BOOKING_CUSTOMER_KEY)
      .filter((booking) => matchesStatus(booking, status))
      .sort(sortNewestFirst);
    return pageOf(items, page, size).map(toView);
  },

  async listAll({ status = '', keyword = '', page = 0, size = 20 } = {}) {
    const items = getBookings()
      .filter((booking) => matchesStatus(booking, status))
      .filter((booking) => matchesKeyword(booking, keyword))
      .sort(sortNewestFirst);
    return { items: pageOf(items, page, size).map(toView), total: items.length };
  },

  async getByCode(bookingCode) {
    const booking = getBooking(bookingCode);
    if (!booking) {
      throw new Error('Không tìm thấy đặt phòng này.');
    }
    return toView(booking);
  },

  async create(payload) {
    return toView(createBooking(payload));
  },

  async cancel(bookingCode, reason) {
    return toView(cancelBooking(bookingCode, reason));
  },

  async payDeposit(bookingCode, method) {
    return toView(payBookingDeposit(bookingCode, method));
  },
};
