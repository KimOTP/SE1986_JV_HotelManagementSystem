import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Row } from 'react-bootstrap';
import { ClockHistory } from 'react-bootstrap-icons';
import { Link, useParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import BookingStatus from '../components/BookingStatus';
import PageHeading from '../components/PageHeading';
import { DEMO_BOOKING_CUSTOMER_KEY, getBooking } from '../mocks/bookingStore';
import {
  displayDate,
  displayDateTime,
  formatHoldTime,
  holdRemainingSeconds,
  money,
} from '../utils/bookingUtils';

export default function BookingDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canManageBookings = hasPermission('UC-C5');
  const canCancelBooking = hasPermission('UC-C4');
  const canPayDeposit = hasPermission('UC-C2');
  const booking = getBooking(id);
  const [, setTick] = useState(0);
  const holdDeadline = booking?.holdExpiresAt;
  const bookingStatus = booking?.status;

  // Đếm ngược thời gian giữ phòng của booking PENDING.
  useEffect(() => {
    if (bookingStatus !== 'PENDING' || !holdDeadline) {
      return undefined;
    }
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [bookingStatus, holdDeadline]);

  const remaining = booking ? holdRemainingSeconds(booking) : null;

  if (!booking) {
    return (
      <Alert variant="warning">
        Không tìm thấy đặt phòng <strong>{id}</strong>. <Link to="/bookings">Về danh sách</Link>
      </Alert>
    );
  }
  const canViewAllBookings = canManageBookings;
  const belongsToCurrentCustomer = booking.customerKey === DEMO_BOOKING_CUSTOMER_KEY;
  if (!canViewAllBookings && !belongsToCurrentCustomer) {
    return <Alert variant="danger">Bạn không có UC-C6 để xem đặt phòng này.</Alert>;
  }
  const holdExpired =
    booking.status === 'PENDING' && remaining !== null && remaining <= 0;
  const displayStatus = holdExpired ? 'EXPIRED' : booking.status;
  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status) && !holdExpired;
  const canPay = booking.status === 'PENDING' && !holdExpired;

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
      {booking.status === 'PENDING' && remaining !== null && (
        <div className={`booking-hold${remaining > 0 ? '' : ' is-expired'}`}>
          <ClockHistory className="booking-hold__icon" aria-hidden="true" />
          <div className="booking-hold__body">
            <strong>
              {remaining > 0
                ? `Giữ phòng còn ${formatHoldTime(remaining)}`
                : 'Đã hết hạn giữ chỗ'}
            </strong>
            <span>
              {remaining > 0
                ? `Thanh toán cọc trước ${displayDateTime(booking.holdExpiresAt)} để giữ phòng. Quá hạn, phòng sẽ được nhả cho khách khác.`
                : 'Phòng đã được nhả cho khách khác. Vui lòng tạo đặt phòng mới.'}
            </span>
          </div>
          {remaining > 0 && canPayDeposit && (
            <Button as={Link} to={`/bookings/deposit?bookingId=${booking.id}`} size="sm">
              Thanh toán cọc
            </Button>
          )}
        </div>
      )}

      {booking.status === 'EXPIRED' && (
        <Alert variant="warning">
          Đặt phòng đã hết hạn giữ chỗ (quá 15 phút chưa thanh toán cọc) và phòng đã
          được nhả. Vui lòng đặt lại đơn mới.
        </Alert>
      )}
      <Row className="g-4">
        <Col lg={7}>
          <Card className="booking-card mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <h3 className="booking-section-title mb-0">Thông tin lưu trú</h3>
                <BookingStatus status={displayStatus} />
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
                {canPay && canPayDeposit && (
                  <Button as={Link} to={`/bookings/deposit?bookingId=${booking.id}`}>
                    Thanh toán tiền cọc
                  </Button>
                )}
                {canCancel && canCancelBooking && (
                  <Button as={Link} to={`/bookings/${booking.id}/cancel`} variant="outline-danger">
                    Hủy đặt phòng
                  </Button>
                )}
                {(!canPay || !canPayDeposit) && (!canCancel || !canCancelBooking) && (
                  <p className="booking-hint m-0">
                    {booking.status === 'EXPIRED'
                      ? 'Đơn đã hết hạn giữ chỗ nên không thể thanh toán hoặc hủy.'
                      : 'Không có thao tác nào khả dụng cho trạng thái này.'}
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
