import { Alert, Button, Card, Col, Row } from 'react-bootstrap';
import { Link, useParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import BookingStatus from '../components/BookingStatus';
import PageHeading from '../components/PageHeading';
import { getBooking } from '../mocks/bookingStore';
import { displayDate, displayDateTime, money } from '../utils/bookingUtils';

export default function BookingDetailPage() {
  const { id } = useParams();
  const { canManageBookings } = useAuth();
  const booking = getBooking(id);
  if (!booking) {
    return (
      <Alert variant="warning">
        Không tìm thấy đặt phòng <strong>{id}</strong>. <Link to="/bookings">Về danh sách</Link>
      </Alert>
    );
  }
  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);
  const canPay = booking.status === 'PENDING';

  return (
    <div className="bookings-module booking-page">
      <PageHeading
        title={`Chi tiết đặt phòng ${booking.id}`}
        description="Thông tin đặt phòng và dòng thời gian trạng thái."
        actions={
          <Button
            as={Link}
            to={canManageBookings ? '/admin/bookings' : '/bookings'}
            variant="outline-secondary"
          >
            Quay lại danh sách
          </Button>
        }
      />
      <Row className="g-4">
        <Col lg={7}>
          <Card className="booking-card mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <h3 className="booking-section-title mb-0">Thông tin lưu trú</h3>
                <BookingStatus status={booking.status} />
              </div>
              <dl className="booking-info">
                <dt>Khách hàng</dt>
                <dd>{booking.customerName}</dd>
                <dt>Điện thoại / email</dt>
                <dd>
                  {booking.phone}
                  <br />
                  {booking.email}
                </dd>
                <dt>Loại phòng</dt>
                <dd>
                  {booking.roomTypeName} × {booking.rooms}
                </dd>
                <dt>Ngày nhận phòng</dt>
                <dd>{displayDate(booking.checkIn)}</dd>
                <dt>Ngày trả phòng</dt>
                <dd>{displayDate(booking.checkOut)}</dd>
                <dt>Số khách</dt>
                <dd>{booking.guests}</dd>
                <dt>Tổng tiền dự kiến</dt>
                <dd className="fw-semibold">{money(booking.totalAmount)}</dd>
                <dt>Tiền cọc</dt>
                <dd>
                  {money(booking.depositPaid)} / {money(booking.depositRequired)}
                </dd>
                {booking.cancellationReason && (
                  <>
                    <dt>Lý do hủy</dt>
                    <dd>{booking.cancellationReason}</dd>
                  </>
                )}
              </dl>
            </Card.Body>
          </Card>
          <Card className="booking-card">
            <Card.Body>
              <h3 className="booking-section-title">Dòng thời gian</h3>
              <ol className="booking-timeline">
                {booking.timeline.map((event, index) => (
                  <li className="booking-timeline-item" key={`${event.status}-${index}`}>
                    <span className={`booking-timeline-dot status-${event.status.toLowerCase()}`} />
                    <div>
                      <div className="booking-timeline-label">{event.label}</div>
                      <span className="booking-timeline-time">{displayDateTime(event.at)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="booking-card">
            <Card.Body>
              <h3 className="booking-section-title">Thao tác</h3>
              <div className="booking-actions">
                {canPay && (
                  <Button as={Link} to={`/bookings/deposit?bookingId=${booking.id}`}>
                    Thanh toán tiền cọc
                  </Button>
                )}
                {canCancel && (
                  <Button as={Link} to={`/bookings/${booking.id}/cancel`} variant="outline-danger">
                    Hủy đặt phòng
                  </Button>
                )}
                {!canPay && !canCancel && (
                  <p className="booking-hint m-0">
                    Không có thao tác nào khả dụng cho trạng thái này.
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
