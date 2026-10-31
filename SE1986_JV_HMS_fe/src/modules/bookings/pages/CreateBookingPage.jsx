import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router';
import { roomsApi } from '../../rooms/api/roomsApi';
import { validateSearch } from '../../rooms/utils/roomUtils';
import BookingError from '../components/BookingError';
import PageHeading from '../components/PageHeading';
import { createBooking } from '../mocks/bookingStore';
import { money, nightsBetween, today } from '../utils/bookingUtils';

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRoomTypeId = params.get('roomTypeId') || '';
  const [error, setError] = useState('');
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId);
  const [form, setForm] = useState({
    customerName: 'Nguyễn An',
    email: 'customer@hotel.demo',
    phone: '0900000001',
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    guests: params.get('guests') || 1,
    rooms: params.get('roomCount') || 1,
  });
  useEffect(() => {
    let live = true;
    roomsApi
      .getAll()
      .then((data) => {
        if (!live) return;
        const activeTypes = data.roomTypes.filter((room) => room.isActive);
        setRoomTypes(activeTypes);
        if (!activeTypes.some((room) => room.id === initialRoomTypeId))
          setRoomTypeId(activeTypes[0]?.id || '');
      })
      .catch((caught) => {
        if (live) setError(caught?.response?.data?.message || caught.message);
      })
      .finally(() => {
        if (live) setLoadingTypes(false);
      });
    return () => {
      live = false;
    };
  }, [initialRoomTypeId]);
  const roomType = roomTypes.find((room) => room.id === roomTypeId);
  const nights = nightsBetween(form.checkIn, form.checkOut);
  const total = (roomType?.basePrice || 0) * Math.max(nights, 0) * Number(form.rooms);
  const deposit = Math.round(total * 0.3);

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const dateErrors = validateSearch({
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guests: form.guests,
    });
    if (Object.keys(dateErrors).length) return setError(Object.values(dateErrors)[0]);
    if (!roomType) return setError('Vui lòng chọn loại phòng.');
    if (!Number.isInteger(Number(form.rooms)) || Number(form.rooms) < 1)
      return setError('Số phòng phải là số nguyên từ 1 trở lên.');
    if (Number(form.guests) > roomType.capacity * Number(form.rooms))
      return setError(`Loại phòng này chỉ phục vụ tối đa ${roomType.capacity} khách/phòng.`);

    setSubmitting(true);
    roomsApi
      .availability(roomType.id, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: form.guests,
      })
      .then((availability) => {
        const availableRooms = Number(availability?.availableRooms || 0);
        if (availableRooms < Number(form.rooms))
          throw new Error(`Chỉ còn ${availableRooms} phòng phù hợp trong khoảng ngày đã chọn.`);
        const booking = createBooking({
          ...form,
          guests: Number(form.guests),
          rooms: Number(form.rooms),
          roomTypeId: roomType.id,
          roomTypeName: roomType.name,
          roomPrice: roomType.basePrice,
          roomCapacity: roomType.capacity,
          totalAmount: total,
          depositRequired: deposit,
          availableRooms,
        });
        navigate(`/bookings/${booking.id}`);
      })
      .catch((caught) => setError(caught?.response?.data?.message || caught.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="bookings-module booking-page">
      <PageHeading
        title="Tạo đặt phòng"
        description="Gửi yêu cầu đặt phòng ở trạng thái chờ thanh toán."
      />
      <Form onSubmit={submit}>
        <Row className="g-4">
          <Col lg={7}>
            <Card className="booking-card">
              <Card.Body>
                <h3 className="booking-section-title">Thông tin khách hàng</h3>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Họ và tên</Form.Label>
                      <Form.Control
                        required
                        name="customerName"
                        value={form.customerName}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Số điện thoại</Form.Label>
                      <Form.Control
                        required
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        required
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <hr className="my-4" />
                <h3 className="booking-section-title">Thông tin lưu trú</h3>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Loại phòng</Form.Label>
                      <Form.Select
                        value={roomTypeId}
                        onChange={(event) => setRoomTypeId(event.target.value)}
                        disabled={loadingTypes || roomTypes.length === 0}
                      >
                        {roomTypes.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} · {money(room.basePrice)}/đêm · tối đa {room.capacity} khách
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Số khách</Form.Label>
                      <Form.Control
                        required
                        name="guests"
                        type="number"
                        min="1"
                        value={form.guests}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Ngày nhận phòng</Form.Label>
                      <Form.Control
                        required
                        name="checkIn"
                        type="date"
                        min={today()}
                        value={form.checkIn}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Ngày trả phòng</Form.Label>
                      <Form.Control
                        required
                        name="checkOut"
                        type="date"
                        min={form.checkIn || today()}
                        value={form.checkOut}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Số phòng</Form.Label>
                      <Form.Control
                        required
                        name="rooms"
                        type="number"
                        min="1"
                        max="10"
                        value={form.rooms}
                        onChange={update}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={5}>
            <Card className="booking-card mb-3">
              <Card.Body>
                <h3 className="booking-section-title">Tóm tắt đặt phòng</h3>
                <div className="booking-summary">
                  <div className="booking-summary-row">
                    <span>Giá mỗi đêm</span>
                    <strong>{money(roomType?.basePrice)}</strong>
                  </div>
                  <div className="booking-summary-row">
                    <span>Số đêm</span>
                    <strong>{Math.max(nights, 0)}</strong>
                  </div>
                  <div className="booking-summary-row">
                    <span>Số phòng</span>
                    <strong>{form.rooms}</strong>
                  </div>
                  <div className="booking-summary-divider" />
                  <div className="booking-summary-row booking-summary-total">
                    <span>Tổng tiền dự kiến</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <div className="booking-summary-row booking-summary-deposit">
                    <span>Tiền cọc (30%)</span>
                    <strong>{money(deposit)}</strong>
                  </div>
                </div>
                <p className="booking-hint">
                  Đặt phòng được tạo ở trạng thái chờ. Tiền cọc trong bản demo không phải giao dịch
                  ngân hàng thực.
                </p>
              </Card.Body>
            </Card>
            <BookingError error={error} />
            <Button
              type="submit"
              className="w-100"
              disabled={loadingTypes || submitting || !roomType}
            >
              {submitting ? 'Đang kiểm tra phòng…' : 'Tạo đặt phòng'}
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
