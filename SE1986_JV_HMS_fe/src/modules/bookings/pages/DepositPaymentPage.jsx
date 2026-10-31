import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useSearchParams } from 'react-router';
import BookingError from '../components/BookingError';
import PageHeading from '../components/PageHeading';
import { getBookings, payBookingDeposit } from '../mocks/bookingStore';
import { displayDate, money, nightsBetween } from '../utils/bookingUtils';

export default function DepositPaymentPage() {
  const [params] = useSearchParams();
  const [bookings, setBookings] = useState(() => getBookings());
  const [selectedId, setSelectedId] = useState(params.get('bookingId') || '');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paying, setPaying] = useState(false);
  const selected = bookings.find((booking) => booking.id === selectedId);
  const payableBookings = bookings.filter((booking) => booking.status === 'PENDING');

  const pay = () => {
    setError('');
    setNotice('');
    setPaying(true);
    try {
      payBookingDeposit(selectedId, paymentMethod);
      setBookings(getBookings());
      setNotice(`Đã ghi nhận thanh toán cọc demo cho ${selectedId}.`);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bookings-module booking-page">
      <PageHeading
        title="Thanh toán tiền cọc"
        description="Xác nhận thanh toán demo để chuyển đặt phòng sang đã xác nhận."
      />
      {notice && <Alert variant="success">{notice}</Alert>}
      <BookingError error={error} />
      <Row className="g-4">
        <Col lg={7}>
          <Card className="booking-card">
            <Card.Body>
              <h3 className="booking-section-title">Thông tin thanh toán</h3>
              <Form.Group className="mb-3">
                <Form.Label>Chọn mã đặt phòng đang chờ</Form.Label>
                <Form.Select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  <option value="">-- Chọn đặt phòng --</option>
                  {payableBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.id} · {booking.customerName} · {displayDate(booking.checkIn)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Phương thức thanh toán demo</Form.Label>
                <Form.Select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                  <option value="CREDIT_CARD">Thẻ tín dụng</option>
                  <option value="CASH">Tiền mặt tại quầy</option>
                </Form.Select>
              </Form.Group>
              <Alert variant="info" className="mt-3 mb-0">
                Đây là thao tác mô phỏng trên trình duyệt, không kết nối cổng thanh toán và không
                phát sinh giao dịch thật.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="booking-card">
            <Card.Body>
              <h3 className="booking-section-title">Thông tin tiền cọc</h3>
              {selected ? (
                <>
                  <p className="booking-hint mt-0 mb-3">
                    {selected.id} · {selected.roomTypeName}
                  </p>
                  <div className="booking-summary mb-3">
                    <div className="booking-summary-row">
                      <span>Thời gian lưu trú</span>
                      <strong>{nightsBetween(selected.checkIn, selected.checkOut)} đêm</strong>
                    </div>
                    <div className="booking-summary-row">
                      <span>Tổng tiền</span>
                      <strong>{money(selected.totalAmount)}</strong>
                    </div>
                    <div className="booking-summary-divider" />
                    <div className="booking-summary-row booking-summary-deposit">
                      <span>Cần thanh toán</span>
                      <strong>{money(selected.depositRequired)}</strong>
                    </div>
                  </div>
                  {selected.status === 'PENDING' ? (
                    <Button className="w-100" onClick={pay} disabled={paying}>
                      {paying ? 'Đang xử lý…' : 'Xác nhận thanh toán demo'}
                    </Button>
                  ) : (
                    <Alert variant="success" className="mb-0">
                      Đặt phòng đã được xác nhận. Phương thức: {selected.paymentMethod}.
                    </Alert>
                  )}
                </>
              ) : (
                <p className="booking-hint mt-0 mb-0">
                  {payableBookings.length
                    ? 'Chọn một đặt phòng để xem số tiền cọc.'
                    : 'Không có đặt phòng nào đang chờ thanh toán.'}
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
