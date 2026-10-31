import { useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router';
import BookingError from '../components/BookingError';
import BookingStatus from '../components/BookingStatus';
import PageHeading from '../components/PageHeading';
import { cancelBooking, getBooking } from '../mocks/bookingStore';
import { displayDate } from '../utils/bookingUtils';

export default function CancelBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(() => getBooking(id));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmCancel = () => {
    setError('');
    try {
      const updated = cancelBooking(id, reason.trim());
      setBooking(updated);
      setShowConfirm(false);
      navigate(`/bookings/${updated.id}`);
    } catch (caught) {
      setError(caught.message);
    }
  };

  if (!booking) {
    return (
      <Alert variant="warning">
        Không tìm thấy đặt phòng. <Link to="/bookings">Quay lại</Link>
      </Alert>
    );
  }
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    return (
      <Alert variant="info">
        Đặt phòng {booking.id} không thể hủy ở trạng thái hiện tại.{' '}
        <Link to={`/bookings/${booking.id}`}>Xem chi tiết</Link>
      </Alert>
    );
  }

  return (
    <div className="bookings-module booking-page">
      <PageHeading
        title="Xác nhận hủy đặt phòng"
        description="Kiểm tra thông tin và xác nhận trước khi hủy."
      />
      <BookingError error={error} />
      <Card className="booking-card booking-card-narrow">
        <Card.Body>
          <Alert variant="warning">
            Hủy đặt phòng là thao tác không thể hoàn tác. Khoản cọc (nếu có) trong demo không được
            hoàn tự động.
          </Alert>
          <dl className="booking-info mb-4">
            <dt>Mã đặt phòng</dt>
            <dd>{booking.id}</dd>
            <dt>Loại phòng</dt>
            <dd>{booking.roomTypeName}</dd>
            <dt>Ngày lưu trú</dt>
            <dd>
              {displayDate(booking.checkIn)} – {displayDate(booking.checkOut)}
            </dd>
            <dt>Trạng thái</dt>
            <dd>
              <BookingStatus status={booking.status} />
            </dd>
          </dl>
          <Form.Group className="mb-4">
            <Form.Label>Lý do hủy (không bắt buộc)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
            />
          </Form.Group>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-secondary" as={Link} to={`/bookings/${booking.id}`}>
              Giữ đặt phòng
            </Button>
            <Button variant="danger" onClick={() => setShowConfirm(true)}>
              Tiếp tục hủy
            </Button>
          </div>
        </Card.Body>
      </Card>
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận hủy</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn hủy đặt phòng <strong>{booking.id}</strong> không?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Quay lại
          </Button>
          <Button variant="danger" onClick={confirmCancel}>
            Xác nhận hủy đặt phòng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
