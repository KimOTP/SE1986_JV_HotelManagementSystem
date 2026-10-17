// Module D - Front Desk, Invoice & Payment
// In-memory mock store (UI only). Replace each function with an API call later;
// the pages only depend on these function signatures.
import { seedRoomTypes } from '../../rooms/mocks/seedData';

export const TODAY = '2026-10-17';

// Single source of truth for room prices: Module B room type catalog
const priceOf = (roomTypeName) =>
  seedRoomTypes.find((t) => t.name === roomTypeName)?.basePrice ?? 0;

let reservations = [
  { id: 'BK-1001', guestName: 'Nguyễn Văn Khách', phone: '0901234567', idNumber: '079201001234', roomNumber: '104', roomType: 'Deluxe', checkIn: '2026-10-17', checkOut: '2026-10-19', guests: 2, deposit: 500000, pricePerNight: priceOf('Deluxe'), status: 'CONFIRMED', services: [] },
  { id: 'BK-1002', guestName: 'Trần Thị Mai', phone: '0912345678', idNumber: '079301005678', roomNumber: '201', roomType: 'Standard', checkIn: '2026-10-17', checkOut: '2026-10-18', guests: 1, deposit: 300000, pricePerNight: priceOf('Standard'), status: 'CONFIRMED', services: [] },
  {
    id: 'BK-1003', guestName: 'Lê Văn Cường', phone: '0987654321', idNumber: '079101009999', roomNumber: '303', roomType: 'Executive Suite', checkIn: '2026-10-16', checkOut: '2026-10-18', guests: 3, deposit: 1000000, pricePerNight: priceOf('Executive Suite'), status: 'CHECKED_IN', actualCheckIn: '2026-10-16 14:20', services: [
      { name: 'Giặt ủi', quantity: 2, unitPrice: 80000 },
      { name: 'Ăn sáng', quantity: 4, unitPrice: 150000 },
    ]
  },
  {
    id: 'BK-1004', guestName: 'Phạm Thị Dung', phone: '0933222111', idNumber: '079401002222', roomNumber: '301', roomType: 'Deluxe', checkIn: '2026-10-15', checkOut: '2026-10-17', guests: 2, deposit: 600000, pricePerNight: priceOf('Deluxe'), status: 'CHECKED_IN', actualCheckIn: '2026-10-15 13:05', services: [
      { name: 'Minibar', quantity: 3, unitPrice: 60000 },
    ]
  },
  { id: 'BK-1005', guestName: 'Hoàng Văn Em', phone: '0977111222', idNumber: '079501003333', roomNumber: '101', roomType: 'Standard', checkIn: '2026-10-14', checkOut: '2026-10-16', guests: 1, deposit: 300000, pricePerNight: priceOf('Standard'), status: 'CHECKED_OUT', actualCheckIn: '2026-10-14 15:00', actualCheckOut: '2026-10-16 11:30', services: [] },
  { id: 'BK-1006', guestName: 'Vũ Thị Phương', phone: '0966333444', idNumber: '079601004444', roomNumber: '303', roomType: 'Executive Suite', checkIn: '2026-10-18', checkOut: '2026-10-20', guests: 2, deposit: 1000000, pricePerNight: priceOf('Executive Suite'), status: 'CONFIRMED', services: [] },
];

let invoices = [
  {
    id: 'INV-2001', bookingId: 'BK-1005', guestName: 'Hoàng Văn Em', roomNumber: '101', issuedAt: '2026-10-16',
    items: [
      { description: 'Tiền phòng Standard (2 đêm)', type: 'ROOM', quantity: 2, unitPrice: priceOf('Standard') },
      { description: 'Giặt ủi', type: 'SERVICE', quantity: 1, unitPrice: 80000 },
    ],
    discount: 0, taxRate: 10, deposit: 300000, paymentMethod: 'CASH', status: 'PAID', note: '',
  },
  {
    id: 'INV-2002', bookingId: 'BK-0990', guestName: 'Đặng Minh Quân', roomNumber: '302', issuedAt: '2026-10-15',
    items: [
      { description: 'Tiền phòng Deluxe (3 đêm)', type: 'ROOM', quantity: 3, unitPrice: priceOf('Deluxe') },
      { description: 'Ăn sáng', type: 'SERVICE', quantity: 6, unitPrice: 150000 },
    ],
    discount: 200000, taxRate: 10, deposit: 600000, paymentMethod: 'CARD', status: 'PAID', note: 'Khách VIP giảm giá',
  },
  {
    id: 'INV-2003', bookingId: 'BK-0995', guestName: 'Ngô Thị Hà', roomNumber: '303', issuedAt: '2026-10-17',
    items: [
      { description: 'Tiền phòng Executive Suite (1 đêm)', type: 'ROOM', quantity: 1, unitPrice: priceOf('Executive Suite') },
      { description: 'Minibar', type: 'SERVICE', quantity: 2, unitPrice: 60000 },
    ],
    discount: 0, taxRate: 10, deposit: 1000000, paymentMethod: 'TRANSFER', status: 'UNPAID', note: '',
  },
  {
    id: 'INV-2004', bookingId: 'BK-0998', guestName: 'Bùi Quốc Anh', roomNumber: '104', issuedAt: '2026-10-17',
    items: [{ description: 'Tiền phòng Deluxe (2 đêm)', type: 'ROOM', quantity: 2, unitPrice: priceOf('Deluxe') }],
    discount: 0, taxRate: 10, deposit: 500000, paymentMethod: 'CASH', status: 'UNPAID', note: '',
  },
];

let invoiceSeq = 2005;

const clone = (v) => JSON.parse(JSON.stringify(v));

// ---------- Reservations (UC-D1, UC-D2) ----------
export const getReservations = () => clone(reservations);
export const getReservation = (id) => clone(reservations.find((r) => r.id === id) || null);

export const checkInReservation = (id, { roomNumber, idNumber, note }) => {
  reservations = reservations.map((r) =>
    r.id === id
      ? { ...r, status: 'CHECKED_IN', roomNumber, idNumber, note, actualCheckIn: `${TODAY} ${new Date().toTimeString().slice(0, 5)}` }
      : r,
  );
};

export const checkOutReservation = (id) => {
  reservations = reservations.map((r) =>
    r.id === id
      ? { ...r, status: 'CHECKED_OUT', actualCheckOut: `${TODAY} ${new Date().toTimeString().slice(0, 5)}` }
      : r,
  );
};

// ---------- Invoices (UC-D3 .. UC-D6) ----------
export const getInvoices = () => clone(invoices);
export const getInvoice = (id) => clone(invoices.find((i) => i.id === id) || null);

export const createInvoice = (data) => {
  const invoice = { ...data, id: `INV-${invoiceSeq++}`, issuedAt: TODAY };
  invoices = [invoice, ...invoices];
  return clone(invoice);
};

export const updateInvoice = (id, data) => {
  invoices = invoices.map((i) => (i.id === id ? { ...i, ...data, id } : i));
  return getInvoice(id);
};

export const getInvoiceByBooking = (bookingId) =>
  clone(invoices.find((i) => i.bookingId === bookingId) || null);

// Guest paid: invoice UNPAID -> PAID, and the stay is closed (guest checked out)
export const payInvoice = (id) => {
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return null;
  invoices = invoices.map((i) => (i.id === id ? { ...i, status: 'PAID' } : i));
  if (inv.bookingId) {
    const r = reservations.find((x) => x.id === inv.bookingId);
    if (r && r.status === 'CHECKED_IN') checkOutReservation(r.id);
  }
  return getInvoice(id);
};

export const deleteInvoice = (id) => {
  invoices = invoices.filter((i) => i.id !== id);
};

// Builds invoice line items from a reservation (room + services)
export const buildItemsFromReservation = (r) => {
  const nights = Math.max(
    1,
    Math.round((new Date(r.checkOut) - new Date(r.checkIn)) / 86400000),
  );
  return [
    { description: `Tiền phòng ${r.roomType} (${nights} đêm)`, type: 'ROOM', quantity: nights, unitPrice: r.pricePerNight },
    ...r.services.map((s) => ({ description: s.name, type: 'SERVICE', quantity: s.quantity, unitPrice: s.unitPrice })),
  ];
};
