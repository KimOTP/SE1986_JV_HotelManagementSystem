import { useEffect, useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import {
  ArrowLeft,
  Calendar3,
  CalendarCheck,
  ChatLeftText,
  CheckCircleFill,
  CheckLg,
  ClipboardCheck,
  DashLg,
  DoorClosed,
  DoorOpen,
  Envelope,
  InfoCircle,
  ListUl,
  Moon,
  People,
  Person,
  PlusLg,
  Tag,
  Telephone,
  Wallet2,
  XCircleFill,
} from 'react-bootstrap-icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import { roomsApi } from '../../rooms/api/roomsApi';
import { imageOrFallback, validateSearch } from '../../rooms/utils/roomUtils';
import BookingError from '../components/BookingError';
import { bookingsApi } from '../api/bookingsApi';
import { money, nightsBetween, today } from '../utils/bookingUtils';

const HOTEL_NAME = 'SkyVista Hotel';
const HOTEL_COVER =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80';
const SUMMARY_COVER =
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80';
const BOOKING_STEPS = ['Thông tin đặt phòng', 'Thanh toán tiền cọc', 'Xác nhận'];
const MAX_ROOMS = 10;

const formatDay = (value) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export default function CreateBookingPage() {
  const { hasPermission } = useAuth();
  const canCreateBooking = hasPermission('UC-C1');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRoomTypeId = params.get('roomTypeId') || '';
  const [error, setError] = useState('');
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId);
  const [availability, setAvailability] = useState({ key: '', counts: null });
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [form, setForm] = useState({
    customerName: 'Nguyễn An',
    email: 'customer@hotel.demo',
    phone: '0900000001',
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    guests: Math.max(Number(params.get('guests')) || 1, 1),
    rooms: Math.min(Math.max(Number(params.get('roomCount')) || 1, 1), MAX_ROOMS),
    specialRequests: '',
  });

  useEffect(() => {
    let live = true;
    roomsApi
      .getCatalog()
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

  useEffect(() => {
    if (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) return undefined;
    const key = `${form.checkIn}|${form.checkOut}`;
    let live = true;
    roomsApi
      .search({ checkIn: form.checkIn, checkOut: form.checkOut, guests: 1 })
      .then((results) => {
        if (!live) return;
        setAvailability({
          key,
          counts: Object.fromEntries(
            (results || []).map((room) => [room.id, Number(room.availableRooms || 0)]),
          ),
        });
      })
      .catch(() => {
        if (live) setAvailability({ key, counts: {} });
      });
    return () => {
      live = false;
    };
  }, [form.checkIn, form.checkOut]);

  const roomType = roomTypes.find((room) => room.id === roomTypeId);
  const nights = Math.max(nightsBetween(form.checkIn, form.checkOut), 0);
  const total = (roomType?.basePrice || 0) * nights * Number(form.rooms);
  const deposit = Math.round(total * 0.3);
  const maxGuests = roomType ? roomType.capacity * Number(form.rooms) : 20;
  const guestCount = Number(form.guests);
  const roomCount = Number(form.rooms);
  const hasDateRange = Boolean(form.checkIn && form.checkOut && form.checkOut > form.checkIn);
  const availabilityKey = `${form.checkIn}|${form.checkOut}`;
  const hasAvailabilityResult =
    availability.key === availabilityKey && availability.counts !== null;
  const availabilityCounts = hasAvailabilityResult ? availability.counts : {};
  const checkingAvailability = hasDateRange && !hasAvailabilityResult;
  const selectedAvailability =
    roomTypeId && Object.prototype.hasOwnProperty.call(availabilityCounts, roomTypeId)
      ? availabilityCounts[roomTypeId]
      : null;
  const maxRooms =
    selectedAvailability === null
      ? MAX_ROOMS
      : Math.max(1, Math.min(MAX_ROOMS, selectedAvailability));

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const updateCount = (name, delta) => {
    setForm((current) => {
      if (name === 'rooms') {
        const rooms = Math.min(Math.max(Number(current.rooms) + delta, 1), maxRooms);
        const capacityLimit = roomType ? roomType.capacity * rooms : 20;
        return {
          ...current,
          rooms,
          guests: Math.min(Number(current.guests) || 1, capacityLimit),
        };
      }
      const limit = roomType ? roomType.capacity * Number(current.rooms) : 20;
      const guests = Math.min(Math.max(Number(current.guests) + delta, 1), limit);
      return { ...current, guests };
    });
  };

  const selectRoomType = (nextRoomType) => {
    setRoomTypeId(nextRoomType.id);
    setForm((current) => ({
      ...current,
      guests: Math.min(Number(current.guests) || 1, nextRoomType.capacity * Number(current.rooms)),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canCreateBooking) return setError('Bạn không có UC-C1 để tạo đặt phòng.');
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
    if (!acceptedTerms)
      return setError('Vui lòng đọc và đồng ý với chính sách đặt phòng và điều khoản hủy phòng.');

    setSubmitting(true);
    roomsApi
      .availability(roomType.id, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Math.ceil(guestCount / roomCount),
      })
      .then(async (availabilityResult) => {
        const availableRooms = Number(availabilityResult?.availableRooms || 0);
        if (availableRooms < Number(form.rooms))
          throw new Error(`Chỉ còn ${availableRooms} phòng phù hợp trong khoảng ngày đã chọn.`);
        const booking = await bookingsApi.create({
          roomTypeId: Number(roomType.id),
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          rooms: Number(form.rooms),
          customerName: form.customerName,
          email: form.email,
          phone: form.phone,
          specialRequests: form.specialRequests.trim(),
          // Mock cần thêm dữ liệu hiển thị; API mode bỏ qua các trường này.
          roomTypeName: roomType.name,
          roomPrice: roomType.basePrice,
          roomCapacity: roomType.capacity,
          totalAmount: total,
          depositRequired: deposit,
          availableRooms,
        });
        navigate(`/bookings/${booking.bookingCode || booking.id}`);
      })
      .catch((caught) => setError(caught?.response?.data?.message || caught.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="bookings-module booking-page booking-create-page">
      <section className="booking-create-hero">
        <img
          className="booking-create-hero-img"
          src={HOTEL_COVER}
          alt={`${HOTEL_NAME} - không gian nghỉ dưỡng`}
        />
        <div className="booking-create-hero-shade" />
        <div className="booking-create-hero-content">
          <Link className="booking-create-back" to="/rooms">
            <ArrowLeft aria-hidden="true" /> Quay lại
          </Link>
          <h2 className="booking-create-hero-title">Tạo đặt phòng</h2>
          <p className="booking-create-hero-subtitle">
            Tận hưởng kỳ nghỉ tuyệt vời tại {HOTEL_NAME}
          </p>
        </div>
      </section>

      <ol className="booking-create-steps" aria-label="Tiến trình đặt phòng">
        {BOOKING_STEPS.map((step, index) => (
          <li
            key={step}
            className={`booking-create-step ${index === 0 ? 'is-active' : ''}`}
            aria-current={index === 0 ? 'step' : undefined}
          >
            <span className="booking-create-step-number">{index + 1}</span>
            <span className="booking-create-step-label">{step}</span>
            {index < BOOKING_STEPS.length - 1 && (
              <span className="booking-create-step-line" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <Form onSubmit={submit}>
        <Row className="g-4 booking-create-layout">
          <Col lg={8}>
            <section className="booking-create-card">
              <header className="booking-create-card-head">
                <span className="booking-create-badge">1</span>
                <h3 className="booking-create-card-title">Chọn ngày lưu trú</h3>
              </header>
              <div className="booking-date-grid">
                <Form.Group controlId="booking-check-in">
                  <Form.Label className="booking-field-label">
                    <Calendar3 className="booking-field-icon" aria-hidden="true" />
                    Ngày nhận phòng
                    <span className="booking-required">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    name="checkIn"
                    type="date"
                    min={today()}
                    value={form.checkIn}
                    onChange={update}
                  />
                </Form.Group>
                <Form.Group controlId="booking-check-out">
                  <Form.Label className="booking-field-label">
                    <Calendar3 className="booking-field-icon" aria-hidden="true" />
                    Ngày trả phòng
                    <span className="booking-required">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    name="checkOut"
                    type="date"
                    min={form.checkIn || today()}
                    value={form.checkOut}
                    onChange={update}
                  />
                </Form.Group>
                <div className="booking-nights" aria-live="polite">
                  <span className="booking-nights-icon">
                    <CalendarCheck aria-hidden="true" />
                  </span>
                  <div>
                    <span className="booking-nights-label">Số đêm</span>
                    <strong className="booking-nights-value">{nights} đêm</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="booking-create-card">
              <header className="booking-create-card-head">
                <span className="booking-create-badge">2</span>
                <div>
                  <h3 className="booking-create-card-title">Thông tin khách hàng</h3>
                  <p className="booking-create-card-note">
                    Thông tin liên hệ dùng để xác nhận đặt phòng. Bạn có thể chỉnh sửa nếu cần.
                  </p>
                </div>
              </header>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="booking-customer-name">
                    <Form.Label className="booking-field-label">
                      <Person className="booking-field-icon" aria-hidden="true" />
                      Họ và tên
                    </Form.Label>
                    <Form.Control
                      required
                      name="customerName"
                      value={form.customerName}
                      onChange={update}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="booking-customer-phone">
                    <Form.Label className="booking-field-label">
                      <Telephone className="booking-field-icon" aria-hidden="true" />
                      Số điện thoại
                    </Form.Label>
                    <Form.Control
                      required
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={update}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="booking-customer-email">
                    <Form.Label className="booking-field-label">
                      <Envelope className="booking-field-icon" aria-hidden="true" />
                      Email
                    </Form.Label>
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
            </section>

            <section className="booking-create-card">
              <header className="booking-create-card-head">
                <span className="booking-create-badge">3</span>
                <h3 className="booking-create-card-title">Chọn loại phòng</h3>
              </header>
              <div className="booking-room-picker">
                <div className="booking-room-grid" role="radiogroup" aria-label="Loại phòng">
                  {loadingTypes ? (
                    <div className="booking-room-loading">Đang tải loại phòng…</div>
                  ) : roomTypes.length === 0 ? (
                    <div className="booking-room-loading">Chưa có loại phòng khả dụng.</div>
                  ) : (
                    roomTypes.map((room) => {
                      const selected = room.id === roomTypeId;
                      const roomsLeft = availabilityCounts[room.id];
                      const soldOut = hasDateRange && roomsLeft === 0;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          className={`booking-room-card ${selected ? 'is-selected' : ''} ${
                            soldOut ? 'is-sold-out' : ''
                          }`}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => selectRoomType(room)}
                        >
                          <span className="booking-room-card-media">
                            <img
                              src={imageOrFallback(room.images)}
                              alt={room.name}
                              loading="lazy"
                            />
                            {selected && (
                              <span className="booking-room-card-check">
                                <CheckLg aria-hidden="true" />
                              </span>
                            )}
                            {soldOut && <span className="booking-room-card-sold">Hết phòng</span>}
                          </span>
                          <span className="booking-room-card-body">
                            <strong className="booking-room-card-name">{room.name}</strong>
                            <span className="booking-room-card-specs">
                              <People aria-hidden="true" /> {room.capacity} khách
                              {room.area ? ` · ${room.area} m²` : ''}
                            </span>
                            <span className="booking-room-card-price">
                              {money(room.basePrice)} <small>/đêm</small>
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="booking-room-controls">
                  <div className="booking-stepper">
                    <span className="booking-stepper-label">
                      <People aria-hidden="true" /> Số khách
                    </span>
                    <div className="booking-stepper-controls">
                      <button
                        type="button"
                        className="booking-stepper-btn"
                        onClick={() => updateCount('guests', -1)}
                        disabled={guestCount <= 1}
                        aria-label="Giảm số khách"
                      >
                        <DashLg aria-hidden="true" />
                      </button>
                      <span className="booking-stepper-value" aria-live="polite">
                        {form.guests}
                      </span>
                      <button
                        type="button"
                        className="booking-stepper-btn"
                        onClick={() => updateCount('guests', 1)}
                        disabled={guestCount >= maxGuests}
                        aria-label="Tăng số khách"
                      >
                        <PlusLg aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="booking-stepper">
                    <span className="booking-stepper-label">
                      <DoorClosed aria-hidden="true" /> Số phòng
                    </span>
                    <div className="booking-stepper-controls">
                      <button
                        type="button"
                        className="booking-stepper-btn"
                        onClick={() => updateCount('rooms', -1)}
                        disabled={roomCount <= 1}
                        aria-label="Giảm số phòng"
                      >
                        <DashLg aria-hidden="true" />
                      </button>
                      <span className="booking-stepper-value" aria-live="polite">
                        {form.rooms}
                      </span>
                      <button
                        type="button"
                        className="booking-stepper-btn"
                        onClick={() => updateCount('rooms', 1)}
                        disabled={roomCount >= maxRooms}
                        aria-label="Tăng số phòng"
                      >
                        <PlusLg aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {!hasDateRange ? (
                    <p className="booking-stock-note">
                      Chọn ngày nhận và trả phòng để kiểm tra phòng trống.
                    </p>
                  ) : checkingAvailability ? (
                    <p className="booking-stock-note">Đang kiểm tra phòng trống…</p>
                  ) : selectedAvailability === null ? (
                    <p className="booking-stock-note">Chưa thể kiểm tra tình trạng phòng.</p>
                  ) : selectedAvailability > 0 ? (
                    <p className="booking-stock-note is-available">
                      <CheckCircleFill aria-hidden="true" /> Còn {selectedAvailability} phòng khả
                      dụng.
                    </p>
                  ) : (
                    <p className="booking-stock-note is-unavailable">
                      <XCircleFill aria-hidden="true" /> Hết phòng trong khoảng ngày này.
                    </p>
                  )}
                </div>
              </div>

              <div className="booking-special">
                <Form.Group controlId="booking-special-requests">
                  <Form.Label className="booking-field-label">
                    <ChatLeftText className="booking-field-icon" aria-hidden="true" />
                    Yêu cầu đặc biệt <span className="booking-optional">(không bắt buộc)</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="specialRequests"
                    value={form.specialRequests}
                    onChange={update}
                    placeholder="Ví dụ: phòng tầng cao, giường phụ, ..."
                  />
                </Form.Group>
              </div>
            </section>
          </Col>

          <Col lg={4}>
            <aside className="booking-create-aside">
              <div className="booking-create-summary">
                <div className="booking-create-summary-cover">
                  <img src={SUMMARY_COVER} alt={`${HOTEL_NAME} - ảnh đại diện`} loading="lazy" />
                  <div className="booking-create-summary-brand">
                    <strong>{HOTEL_NAME}</strong>
                    <span>Trải nghiệm nghỉ dưỡng đẳng cấp</span>
                  </div>
                </div>

                <div className="booking-create-summary-body">
                  <h3 className="booking-create-summary-title">
                    <ListUl aria-hidden="true" /> Tóm tắt đặt phòng
                  </h3>

                  <div className="booking-trip">
                    <div className="booking-trip-row">
                      <span className="booking-trip-icon">
                        <DoorOpen aria-hidden="true" />
                      </span>
                      <span className="booking-trip-label">Loại phòng</span>
                      <strong className="booking-trip-value">
                        {roomType?.name || 'Chưa chọn'}
                      </strong>
                    </div>
                    <div className="booking-trip-row">
                      <span className="booking-trip-icon">
                        <Calendar3 aria-hidden="true" />
                      </span>
                      <span className="booking-trip-label">Ngày nhận phòng</span>
                      <strong className="booking-trip-value">{formatDay(form.checkIn)}</strong>
                    </div>
                    <div className="booking-trip-row">
                      <span className="booking-trip-icon">
                        <Calendar3 aria-hidden="true" />
                      </span>
                      <span className="booking-trip-label">Ngày trả phòng</span>
                      <strong className="booking-trip-value">{formatDay(form.checkOut)}</strong>
                    </div>
                    <div className="booking-trip-row">
                      <span className="booking-trip-icon">
                        <Moon aria-hidden="true" />
                      </span>
                      <span className="booking-trip-label">Số đêm</span>
                      <strong className="booking-trip-value">{nights} đêm</strong>
                    </div>
                    <div className="booking-trip-row">
                      <span className="booking-trip-icon">
                        <People aria-hidden="true" />
                      </span>
                      <span className="booking-trip-label">Số khách</span>
                      <strong className="booking-trip-value">{form.guests} khách</strong>
                    </div>
                    <div className="booking-trip-row">
                      <span className="booking-trip-icon">
                        <DoorClosed aria-hidden="true" />
                      </span>
                      <span className="booking-trip-label">Số phòng</span>
                      <strong className="booking-trip-value">{form.rooms} phòng</strong>
                    </div>
                  </div>

                  <div className="booking-price">
                    <div className="booking-price-row">
                      <span>
                        <Tag aria-hidden="true" /> Giá mỗi đêm
                      </span>
                      <strong>{money(roomType?.basePrice)}</strong>
                    </div>
                    <div className="booking-price-row is-total">
                      <span>Tổng tiền</span>
                      <strong>{money(total)}</strong>
                    </div>
                    <div className="booking-price-row is-deposit">
                      <span>
                        <Wallet2 aria-hidden="true" /> Tiền cọc (30%)
                      </span>
                      <strong>{money(deposit)}</strong>
                    </div>
                  </div>

                  <div className="booking-deposit-note">
                    <InfoCircle aria-hidden="true" />
                    <div>
                      <p>
                        Đặt phòng sẽ ở trạng thái <strong>PENDING</strong>. Vui lòng thanh toán tiền
                        cọc để xác nhận đặt phòng.
                      </p>
                      <span>Bản demo: tiền cọc không phải giao dịch ngân hàng thực.</span>
                    </div>
                  </div>

                  <Form.Check
                    type="checkbox"
                    id="booking-terms"
                    className="booking-terms"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    label={
                      <span>
                        Tôi đã đọc và đồng ý với{' '}
                        <span className="booking-terms-accent">chính sách đặt phòng</span> và{' '}
                        <span className="booking-terms-accent">điều khoản hủy phòng</span>.
                      </span>
                    }
                  />

                  <BookingError error={error} />

                  <Button
                    type="submit"
                    className="booking-create-submit"
                    disabled={
                      !canCreateBooking ||
                      loadingTypes ||
                      submitting ||
                      !roomType ||
                      (hasDateRange && selectedAvailability === 0)
                    }
                  >
                    <ClipboardCheck aria-hidden="true" />
                    {submitting ? 'Đang kiểm tra phòng…' : 'Tạo đặt phòng'}
                  </Button>

                  <Link className="booking-create-footer-link" to="/rooms">
                    <ArrowLeft aria-hidden="true" /> Quay lại tìm phòng
                  </Link>
                </div>
              </div>
            </aside>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
