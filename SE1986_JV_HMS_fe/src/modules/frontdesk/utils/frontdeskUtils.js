export const currency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export const INVOICE_STATUS = {
  UNPAID: { label: 'Chưa thanh toán', bg: 'danger' },
  PAID: { label: 'Đã thanh toán', bg: 'success' },
};

export const RESERVATION_STATUS = {
  CONFIRMED: { label: 'Đã xác nhận', bg: 'primary' },
  CHECKED_IN: { label: 'Đang lưu trú', bg: 'warning' },
  CHECKED_OUT: { label: 'Đã trả phòng', bg: 'secondary' },
};

export const PAYMENT_METHODS = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ',
  TRANSFER: 'Chuyển khoản',
};

export const calcTotals = ({ items = [], discount = 0, taxRate = 0, deposit = 0 }) => {
  const subtotal = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0,
  );
  const afterDiscount = Math.max(0, subtotal - (Number(discount) || 0));
  const tax = Math.round((afterDiscount * (Number(taxRate) || 0)) / 100);
  const total = afterDiscount + tax;
  const due = Math.max(0, total - (Number(deposit) || 0));
  return { subtotal, discount: Number(discount) || 0, tax, total, deposit: Number(deposit) || 0, due };
};
