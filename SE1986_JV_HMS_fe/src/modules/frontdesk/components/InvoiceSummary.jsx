import { Badge } from 'react-bootstrap';
import { INVOICE_STATUS, RESERVATION_STATUS, currency } from '../utils/frontdeskUtils';

export const InvoiceStatusBadge = ({ status }) => {
  const s = INVOICE_STATUS[status] || { label: status, bg: 'secondary' };
  return <Badge bg={s.bg} text={s.bg === 'warning' ? 'dark' : undefined}>{s.label}</Badge>;
};

export const ReservationStatusBadge = ({ status }) => {
  const s = RESERVATION_STATUS[status] || { label: status, bg: 'secondary' };
  return <Badge bg={s.bg} text={s.bg === 'warning' ? 'dark' : undefined}>{s.label}</Badge>;
};

// Totals block shared by the form, detail and check-out screens
export default function InvoiceSummary({ totals }) {
  const rows = [
    ['Tạm tính', currency(totals.subtotal)],
    ['Giảm giá', `- ${currency(totals.discount)}`],
    ['Thuế VAT', currency(totals.tax)],
    ['Tổng cộng', currency(totals.total), true],
    ['Đã đặt cọc', `- ${currency(totals.deposit)}`],
  ];
  return (
    <div className="bg-light border rounded p-3">
      {rows.map(([label, value, bold]) => (
        <div key={label} className={`d-flex justify-content-between mb-2 ${bold ? 'fw-bold' : ''}`}>
          <span className="text-muted">{label}</span>
          <span>{value}</span>
        </div>
      ))}
      <hr className="my-2" />
      <div className="d-flex justify-content-between fw-bold fs-5 text-primary">
        <span>Còn phải thu</span>
        <span>{currency(totals.due)}</span>
      </div>
    </div>
  );
}
