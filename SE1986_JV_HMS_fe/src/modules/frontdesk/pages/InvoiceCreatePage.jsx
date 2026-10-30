import { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router';
import InvoiceForm from '../components/InvoiceForm';
import {
  buildItemsFromReservation,
  createInvoice,
  getInvoiceByBooking,
  getReservation,
} from '../mocks/frontdeskStore';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

// UC-D3: Create Invoice (pre-filled from the booking; always saved as UNPAID)
export default function InvoiceCreatePage() {
  const { hasPermission } = useAuth();
  const canCreateInvoice = hasPermission('UC-D3');
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const navigate = useNavigate();
  const [reservation] = useState(() => (bookingId ? getReservation(bookingId) : null));
  const [existing] = useState(() => (bookingId ? getInvoiceByBooking(bookingId) : null));
  const [defaultValues] = useState(() =>
    reservation
      ? {
          bookingId: reservation.id,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber,
          items: buildItemsFromReservation(reservation),
          discount: 0,
          taxRate: 10,
          deposit: reservation.deposit,
          paymentMethod: 'CASH',
          status: 'UNPAID',
          note: '',
        }
      : undefined,
  );

  if (!reservation || reservation.status !== 'CHECKED_IN') {
    return (
      <Alert variant="danger">
        Không tìm thấy khách đang lưu trú cho booking này. <Link to="/frontdesk/check-out">Về Check-out</Link>
      </Alert>
    );
  }
  if (existing) {
    return (
      <Alert variant="warning">
        Booking <strong>{reservation.id}</strong> đã có hóa đơn {existing.id}.{' '}
        <Link to={`/frontdesk/invoices/${existing.id}`}>Xem hóa đơn</Link>
      </Alert>
    );
  }
  if (!canCreateInvoice) {
    return <Alert variant="danger">Bạn không có UC-D3 để tạo hóa đơn.</Alert>;
  }

  const onSubmit = (data) => {
    const invoice = createInvoice({ ...data, status: 'UNPAID' });
    navigate(`/frontdesk/invoices/${invoice.id}`);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Tạo hóa đơn</h2>
        <p className="text-muted mb-0">
          Khách {reservation.guestName} · Phòng {reservation.roomNumber}. Thêm các khoản phát sinh (dọn phòng,
          minibar...) rồi lưu hóa đơn.
        </p>
      </div>
      <InvoiceForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        submitLabel="Tạo hóa đơn"
        onCancel={() => navigate('/frontdesk/check-out')}
        hideStatus
      />
    </div>
  );
}
