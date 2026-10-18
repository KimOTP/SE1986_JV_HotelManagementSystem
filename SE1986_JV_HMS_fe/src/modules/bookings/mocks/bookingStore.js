const STORAGE_KEY = 'se1986.moduleC.bookings.v1';
const DEMO_CUSTOMER_KEY = 'demo-customer';
const clone = (value) => JSON.parse(JSON.stringify(value));
const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const now = () => new Date().toISOString();
const overlaps = (first, second) =>
  first.checkIn < second.checkOut && first.checkOut > second.checkIn;
const validDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return false;
  const [, year, month, date] = match.map(Number);
  const parsed = new Date(year, month - 1, date);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === date
  );
};

const seedBookings = [
  {
    id: 'BK-2601',
    customerKey: DEMO_CUSTOMER_KEY,
    customerName: 'Nguyễn An',
    email: 'customer@hotel.demo',
    phone: '0900000001',
    roomTypeId: 'rt-deluxe',
    roomTypeName: 'Deluxe',
    roomPrice: 950000,
    checkIn: day(5),
    checkOut: day(8),
    guests: 2,
    rooms: 1,
    totalAmount: 2850000,
    depositRequired: 855000,
    depositPaid: 0,
    paymentMethod: '',
    status: 'PENDING',
    createdAt: now(),
    timeline: [{ status: 'PENDING', label: 'Đặt phòng được tạo', at: now() }],
  },
  {
    id: 'BK-2602',
    customerKey: DEMO_CUSTOMER_KEY,
    customerName: 'Nguyễn An',
    email: 'customer@hotel.demo',
    phone: '0900000001',
    roomTypeId: 'rt-family',
    roomTypeName: 'Family',
    roomPrice: 1350000,
    checkIn: day(12),
    checkOut: day(15),
    guests: 3,
    rooms: 1,
    totalAmount: 4050000,
    depositRequired: 1215000,
    depositPaid: 1215000,
    paymentMethod: 'BANK_TRANSFER',
    status: 'CONFIRMED',
    createdAt: now(),
    timeline: [
      { status: 'PENDING', label: 'Đặt phòng được tạo', at: now() },
      { status: 'CONFIRMED', label: 'Đã thanh toán tiền cọc', at: now() },
    ],
  },
  {
    id: 'BK-2603',
    customerKey: DEMO_CUSTOMER_KEY,
    customerName: 'Nguyễn An',
    email: 'customer@hotel.demo',
    phone: '0900000001',
    roomTypeId: 'rt-suite',
    roomTypeName: 'Executive Suite',
    roomPrice: 2200000,
    checkIn: day(-14),
    checkOut: day(-11),
    guests: 2,
    rooms: 1,
    totalAmount: 6600000,
    depositRequired: 1980000,
    depositPaid: 1980000,
    paymentMethod: 'CREDIT_CARD',
    status: 'COMPLETED',
    createdAt: now(),
    timeline: [
      { status: 'PENDING', label: 'Đặt phòng được tạo', at: now() },
      { status: 'CONFIRMED', label: 'Đã thanh toán tiền cọc', at: now() },
      { status: 'COMPLETED', label: 'Đã hoàn tất lưu trú', at: now() },
    ],
  },
];

const read = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return clone(seedBookings);
  let bookings;
  try {
    bookings = JSON.parse(raw);
  } catch {
    throw new Error(
      'Không thể đọc dữ liệu booking demo đã lưu. Hãy xóa dữ liệu booking demo rồi thử lại.',
    );
  }
  if (!Array.isArray(bookings)) throw new Error('Dữ liệu booking demo không hợp lệ.');
  return bookings;
};

const write = (bookings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    throw new Error('Không thể lưu booking demo. Hãy kiểm tra dung lượng hoặc quyền localStorage.');
  }
};

const getByIdOrThrow = (bookings, id) => {
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw new Error('Không tìm thấy đặt phòng này.');
  return booking;
};

export const DEMO_BOOKING_CUSTOMER_KEY = DEMO_CUSTOMER_KEY;
export const getBookings = () => clone(read());
export const getBooking = (id) => clone(read().find((item) => item.id === id) || null);

export const createBooking = (input) => {
  const bookings = read();
  const rooms = Number(input.rooms);
  const availableRooms = Number(input.availableRooms);
  const guests = Number(input.guests);
  const roomPrice = Number(input.roomPrice);
  const roomCapacity = Number(input.roomCapacity);
  if (
    !input.roomTypeId ||
    !validDate(input.checkIn) ||
    !validDate(input.checkOut) ||
    input.checkOut <= input.checkIn
  )
    throw new Error('Thông tin loại phòng hoặc ngày lưu trú không hợp lệ.');
  if (
    !Number.isInteger(rooms) ||
    rooms < 1 ||
    !Number.isInteger(availableRooms) ||
    availableRooms < 1 ||
    !Number.isInteger(guests) ||
    guests < 1 ||
    !Number.isFinite(roomPrice) ||
    roomPrice <= 0 ||
    !Number.isInteger(roomCapacity) ||
    roomCapacity < 1 ||
    guests > roomCapacity * rooms
  )
    throw new Error('Số khách, phòng, sức chứa hoặc giá phòng không hợp lệ.');
  const nights =
    (Date.parse(`${input.checkOut}T00:00:00Z`) - Date.parse(`${input.checkIn}T00:00:00Z`)) /
    86400000;
  const totalAmount = roomPrice * nights * rooms;
  if (!Number.isInteger(nights) || nights < 1 || !Number.isFinite(totalAmount))
    throw new Error('Khoảng ngày hoặc tổng tiền đặt phòng không hợp lệ.');
  const heldRooms = bookings
    .filter(
      (booking) =>
        booking.roomTypeId === input.roomTypeId &&
        ['PENDING', 'CONFIRMED'].includes(booking.status) &&
        overlaps(booking, input),
    )
    .reduce((total, booking) => total + Number(booking.rooms || 1), 0);
  if (heldRooms + rooms > availableRooms)
    throw new Error('Phòng vừa được đặt hết. Vui lòng kiểm tra lại tình trạng phòng.');
  const booking = {
    ...input,
    roomPrice,
    totalAmount,
    depositRequired: Math.round(totalAmount * 0.3),
    id: `BK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    customerKey: DEMO_CUSTOMER_KEY,
    status: 'PENDING',
    depositPaid: 0,
    paymentMethod: '',
    createdAt: now(),
    timeline: [{ status: 'PENDING', label: 'Đặt phòng được tạo', at: now() }],
  };
  write([booking, ...bookings]);
  return clone(booking);
};

export const payBookingDeposit = (id, paymentMethod) => {
  const bookings = read();
  const booking = getByIdOrThrow(bookings, id);
  if (booking.status !== 'PENDING')
    throw new Error('Chỉ đặt phòng đang chờ mới có thể thanh toán cọc.');
  if (!['BANK_TRANSFER', 'CREDIT_CARD', 'CASH'].includes(paymentMethod))
    throw new Error('Vui lòng chọn phương thức thanh toán hợp lệ.');
  const updated = {
    ...booking,
    depositPaid: booking.depositRequired,
    paymentMethod,
    status: 'CONFIRMED',
    timeline: [
      ...booking.timeline,
      { status: 'CONFIRMED', label: 'Đã thanh toán tiền cọc', at: now() },
    ],
  };
  write(bookings.map((item) => (item.id === id ? updated : item)));
  return clone(updated);
};

export const cancelBooking = (id, reason) => {
  const bookings = read();
  const booking = getByIdOrThrow(bookings, id);
  if (!['PENDING', 'CONFIRMED'].includes(booking.status))
    throw new Error('Đặt phòng này không thể hủy ở trạng thái hiện tại.');
  const updated = {
    ...booking,
    status: 'CANCELLED',
    cancellationReason: reason,
    timeline: [
      ...booking.timeline,
      { status: 'CANCELLED', label: 'Đặt phòng đã bị hủy', at: now() },
    ],
  };
  write(bookings.map((item) => (item.id === id ? updated : item)));
  return clone(updated);
};
