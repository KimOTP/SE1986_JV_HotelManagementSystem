import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import { roomsApi } from '../../rooms/api/roomsApi';
import { validateSearch } from '../../rooms/utils/roomUtils';
import {
  cancelBooking,
  createBooking,
  DEMO_BOOKING_CUSTOMER_KEY,
  getBooking,
  getBookings,
  payBookingDeposit,
} from '../mocks/bookingStore';

const STATUS = {
  PENDING: { label: 'Chờ thanh toán', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  CANCELLED: { label: 'Đã hủy', variant: 'secondary' },
  COMPLETED: { label: 'Đã hoàn tất', variant: 'primary' },
};
const money = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000,
  );
  return Number.isFinite(nights) ? nights : 0;
};
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const displayDate = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
const displayDateTime = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
const roomBookingUrl = (params) => {
  const query = new URLSearchParams();
  ['roomTypeId', 'checkIn', 'checkOut', 'guests', 'roomCount'].forEach((key) => {
    const value = params.get(key);
    if (value) query.set(key, value);
  });
  return `/bookings/new?${query.toString()}`;
};

function PageHeading({ title, description, actions }) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
      <div>
        <h2 className="fw-bold mb-1">{title}</h2>
        <p className="text-muted mb-0">{description}</p>
      </div>
      {actions}
    </div>
  );
}

function BookingStatus({ status }) {
  const item = STATUS[status] || { label: status, variant: 'light' };
  return <Badge bg={item.variant}>{item.label}</Badge>;
}

function BookingError({ error }) {
  return error ? <Alert variant="danger">{error}</Alert> : null;
}

export function BookingHandoffPage() {
  const [params] = useSearchParams();
  const roomTypeId = params.get('roomTypeId');
  const [roomType, setRoomType] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    if (!roomTypeId)
      return () => {
        live = false;
      };
    roomsApi
      .getRoomType(roomTypeId)
      .then((result) => {
        if (live && result?.isActive) {
          setRoomType(result);
          setError('');
        } else if (live) setError('Loại phòng không tồn tại hoặc đã ngừng kinh doanh.');
      })
      .catch((caught) => {
        if (live) setError(caught?.response?.data?.message || caught.message);
      });
    return () => {
      live = false;
    };
  }, [roomTypeId]);

  if (!roomTypeId) {
    return (
      <Alert variant="danger">
        Thiếu thông tin loại phòng. <Link to="/rooms">Quay lại tìm phòng</Link>
      </Alert>
    );
  }
  if (error) {
    return (
      <Alert variant="danger">
        {error} <Link to="/rooms">Quay lại tìm phòng</Link>
      </Alert>
    );
  }
  if (!roomType || roomType.id !== roomTypeId)
    return <Alert variant="info">Đang tải thông tin loại phòng…</Alert>;

  const nights = nightsBetween(params.get('checkIn'), params.get('checkOut'));
  const roomCount = Math.max(Number(params.get('roomCount')) || 1, 1);
  const query = roomBookingUrl(params);

  return (
    <Card className="mx-auto shadow-sm" style={{ maxWidth: 680 }}>
      <Card.Body className="p-4">
        <h2 className="fw-bold">Xác nhận thông tin phòng</h2>
        <p className="text-muted">Kiểm tra lựa chọn trước khi tạo yêu cầu đặt phòng.</p>
        <dl className="row">
          <dt className="col-5">Loại phòng</dt>
          <dd className="col-7">{roomType.name}</dd>
          <dt className="col-5">Ngày lưu trú</dt>
          <dd className="col-7">
            {params.get('checkIn')} → {params.get('checkOut')} ({nights} đêm)
          </dd>
          <dt className="col-5">Số khách / phòng</dt>
          <dd className="col-7">
            {params.get('guests')} khách / {roomCount} phòng
          </dd>
          <dt className="col-5">Tổng dự kiến</dt>
          <dd className="col-7 fw-semibold">{money(nights * roomType.basePrice * roomCount)}</dd>
        </dl>
        <Alert variant="info">
          Chọn tiếp tục sẽ tạo yêu cầu ở trạng thái chờ thanh toán. Chưa có giao dịch hay phòng nào
          được xác nhận tại bước này.
        </Alert>
        <div className="d-flex flex-wrap gap-2">
          <Button as={Link} to={query}>
            Tiếp tục đặt phòng
          </Button>
          <Button
            as={Link}
            to={`/rooms/${roomType.id}?checkIn=${params.get('checkIn')}&checkOut=${params.get('checkOut')}&guests=${params.get('guests')}`}
            variant="outline-secondary"
          >
            Quay lại chi tiết phòng
          </Button>
          <Button as={Link} to={`/rooms?${params.toString()}`} variant="link">
            Tìm phòng khác
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export function CreateBookingPage() {
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
    <div className="bookings-module">
      <PageHeading
        title="Tạo đặt phòng"
        description="Gửi yêu cầu đặt phòng ở trạng thái chờ thanh toán."
      />
      <Form onSubmit={submit}>
        <Row className="g-4">
          <Col lg={7}>
            <Card className="shadow-sm">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Thông tin khách hàng</h5>
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
                <h5 className="fw-bold mb-3">Thông tin lưu trú</h5>
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
            <Card className="shadow-sm mb-3">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-3">Tóm tắt đặt phòng</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>Giá mỗi đêm</span>
                  <strong>{money(roomType?.basePrice)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Số đêm</span>
                  <strong>{Math.max(nights, 0)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Số phòng</span>
                  <strong>{form.rooms}</strong>
                </div>
                <hr />
                <div className="d-flex justify-content-between mb-2">
                  <span>Tổng tiền dự kiến</span>
                  <strong>{money(total)}</strong>
                </div>
                <div className="d-flex justify-content-between text-primary">
                  <span>Tiền cọc (30%)</span>
                  <strong>{money(deposit)}</strong>
                </div>
                <p className="small text-muted mt-3 mb-0">
                  Đặt phòng được tạo ở trạng thái chờ. Tiền cọc trong bản demo không phải giao dịch
                  ngân hàng thực.
                </p>
              </Card.Body>
            </Card>
            <BookingError error={error} />
            <Button
              type="submit"
              size="lg"
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

export function DepositPaymentPage() {
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
    <div className="bookings-module">
      <PageHeading
        title="Thanh toán tiền cọc"
        description="Xác nhận thanh toán demo để chuyển đặt phòng sang đã xác nhận."
      />
      {notice && <Alert variant="success">{notice}</Alert>}
      <BookingError error={error} />
      <Row className="g-4">
        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
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
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold">Thông tin tiền cọc</h5>
              {selected ? (
                <>
                  <p className="text-muted">
                    {selected.id} · {selected.roomTypeName}
                  </p>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Thời gian lưu trú</span>
                    <strong>{nightsBetween(selected.checkIn, selected.checkOut)} đêm</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Tổng tiền</span>
                    <strong>{money(selected.totalAmount)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Cần thanh toán</span>
                    <strong className="text-primary">{money(selected.depositRequired)}</strong>
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
                <p className="text-muted mb-0">
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

export function BookingHistoryPage() {
  const { role, canManageBookings } = useAuth();
  const [bookings, setBookings] = useState(() => getBookings());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const visible = canManageBookings
    ? bookings
    : bookings.filter((booking) => booking.customerKey === DEMO_BOOKING_CUSTOMER_KEY);
  const filtered = visible.filter(
    (booking) => statusFilter === 'ALL' || booking.status === statusFilter,
  );
  const isCustomerView = role === 'CUSTOMER' || !canManageBookings;

  return (
    <div className="bookings-module">
      <PageHeading
        title="Đặt phòng của tôi"
        description="Theo dõi trạng thái và lịch sử các lần đặt phòng."
        actions={
          <Button as={Link} to="/bookings/new">
            Tạo đặt phòng
          </Button>
        }
      />
      {isCustomerView && (
        <Alert variant="info">
          Đang hiển thị dữ liệu khách demo trên trình duyệt này. Chưa kết nối tài khoản hoặc
          backend.
        </Alert>
      )}
      <div className="d-flex justify-content-end mb-3">
        <Form.Select
          aria-label="Lọc trạng thái đặt phòng"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(STATUS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </Form.Select>
      </div>
      <Table responsive hover className="align-middle bg-white">
        <thead className="table-light">
          <tr>
            <th>Mã đặt phòng</th>
            <th>Loại phòng</th>
            {!isCustomerView && <th>Khách hàng</th>}
            <th>Ngày lưu trú</th>
            <th className="text-end">Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={isCustomerView ? 6 : 7} className="text-center py-5 text-muted">
                Chưa có đặt phòng phù hợp.
              </td>
            </tr>
          ) : (
            filtered.map((booking) => (
              <tr key={booking.id}>
                <td className="fw-semibold">{booking.id}</td>
                <td>
                  {booking.roomTypeName} <span className="text-muted">× {booking.rooms}</span>
                </td>
                {!isCustomerView && <td>{booking.customerName}</td>}
                <td>
                  {displayDate(booking.checkIn)} – {displayDate(booking.checkOut)}
                </td>
                <td className="text-end">{money(booking.totalAmount)}</td>
                <td>
                  <BookingStatus status={booking.status} />
                </td>
                <td>
                  <Button
                    as={Link}
                    to={`/bookings/${booking.id}`}
                    size="sm"
                    variant="outline-primary"
                  >
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <Button variant="link" onClick={() => setBookings(getBookings())} className="px-0">
        Tải lại dữ liệu demo
      </Button>
    </div>
  );
}

export function CancelBookingPage() {
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
    <div className="bookings-module">
      <PageHeading
        title="Xác nhận hủy đặt phòng"
        description="Kiểm tra thông tin và xác nhận trước khi hủy."
      />
      <BookingError error={error} />
      <Card className="shadow-sm" style={{ maxWidth: 760 }}>
        <Card.Body className="p-4">
          <Alert variant="warning">
            Hủy đặt phòng là thao tác không thể hoàn tác. Khoản cọc (nếu có) trong demo không được
            hoàn tự động.
          </Alert>
          <dl className="row mb-4">
            <dt className="col-sm-4">Mã đặt phòng</dt>
            <dd className="col-sm-8">{booking.id}</dd>
            <dt className="col-sm-4">Loại phòng</dt>
            <dd className="col-sm-8">{booking.roomTypeName}</dd>
            <dt className="col-sm-4">Ngày lưu trú</dt>
            <dd className="col-sm-8">
              {displayDate(booking.checkIn)} – {displayDate(booking.checkOut)}
            </dd>
            <dt className="col-sm-4">Trạng thái</dt>
            <dd className="col-sm-8">
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
          <div className="d-flex gap-2">
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

export function ManageBookingsPage() {
  const [bookings] = useState(() => getBookings());
  const [filters, setFilters] = useState({ keyword: '', status: 'ALL' });
  const filtered = useMemo(() => {
    const keyword = filters.keyword.trim().toLocaleLowerCase('vi');
    return bookings.filter(
      (booking) =>
        (filters.status === 'ALL' || booking.status === filters.status) &&
        (!keyword ||
          [booking.id, booking.customerName, booking.phone, booking.email]
            .join(' ')
            .toLocaleLowerCase('vi')
            .includes(keyword)),
    );
  }, [bookings, filters]);
  const update = (event) =>
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <div className="bookings-module">
      <PageHeading
        title="Quản lý đặt phòng"
        description="Tìm kiếm và lọc đặt phòng theo khách hàng hoặc trạng thái."
      />
      <Form
        className="bg-white border rounded p-3 mb-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <Row className="g-2 align-items-end">
          <Col md={7}>
            <Form.Label className="small fw-semibold">
              Tìm theo mã, khách hàng, điện thoại hoặc email
            </Form.Label>
            <Form.Control
              name="keyword"
              value={filters.keyword}
              onChange={update}
              placeholder="Ví dụ: BK-2601, Nguyễn An..."
            />
          </Col>
          <Col md={3}>
            <Form.Label className="small fw-semibold">Trạng thái</Form.Label>
            <Form.Select name="status" value={filters.status} onChange={update}>
              <option value="ALL">Tất cả</option>
              {Object.entries(STATUS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Button
              variant="outline-secondary"
              className="w-100"
              onClick={() => setFilters({ keyword: '', status: 'ALL' })}
            >
              Xóa lọc
            </Button>
          </Col>
        </Row>
      </Form>
      <Table responsive hover className="align-middle bg-white">
        <thead className="table-light">
          <tr>
            <th>Mã</th>
            <th>Khách hàng</th>
            <th>Liên hệ</th>
            <th>Phòng</th>
            <th>Nhận / trả</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-5 text-muted">
                Không tìm thấy đặt phòng.
              </td>
            </tr>
          ) : (
            filtered.map((booking) => (
              <tr key={booking.id}>
                <td className="fw-semibold">{booking.id}</td>
                <td>{booking.customerName}</td>
                <td>
                  <div>{booking.phone}</div>
                  <small className="text-muted">{booking.email}</small>
                </td>
                <td>
                  {booking.roomTypeName} × {booking.rooms}
                </td>
                <td>
                  {displayDate(booking.checkIn)}
                  <br />
                  {displayDate(booking.checkOut)}
                </td>
                <td>{money(booking.totalAmount)}</td>
                <td>
                  <BookingStatus status={booking.status} />
                </td>
                <td>
                  <Button
                    as={Link}
                    to={`/bookings/${booking.id}`}
                    size="sm"
                    variant="outline-primary"
                  >
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <p className="small text-muted mb-0">
        Tổng cộng {filtered.length} / {bookings.length} đặt phòng demo.
      </p>
    </div>
  );
}

export function BookingDetailPage() {
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
    <div className="bookings-module">
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
          <Card className="shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Thông tin lưu trú</h5>
                <BookingStatus status={booking.status} />
              </div>
              <dl className="row mb-0">
                <dt className="col-sm-5">Khách hàng</dt>
                <dd className="col-sm-7">{booking.customerName}</dd>
                <dt className="col-sm-5">Điện thoại / email</dt>
                <dd className="col-sm-7">
                  {booking.phone}
                  <br />
                  {booking.email}
                </dd>
                <dt className="col-sm-5">Loại phòng</dt>
                <dd className="col-sm-7">
                  {booking.roomTypeName} × {booking.rooms}
                </dd>
                <dt className="col-sm-5">Ngày nhận phòng</dt>
                <dd className="col-sm-7">{displayDate(booking.checkIn)}</dd>
                <dt className="col-sm-5">Ngày trả phòng</dt>
                <dd className="col-sm-7">{displayDate(booking.checkOut)}</dd>
                <dt className="col-sm-5">Số khách</dt>
                <dd className="col-sm-7">{booking.guests}</dd>
                <dt className="col-sm-5">Tổng tiền dự kiến</dt>
                <dd className="col-sm-7 fw-semibold">{money(booking.totalAmount)}</dd>
                <dt className="col-sm-5">Tiền cọc</dt>
                <dd className="col-sm-7">
                  {money(booking.depositPaid)} / {money(booking.depositRequired)}
                </dd>
                {booking.cancellationReason && (
                  <>
                    <dt className="col-sm-5">Lý do hủy</dt>
                    <dd className="col-sm-7">{booking.cancellationReason}</dd>
                  </>
                )}
              </dl>
            </Card.Body>
          </Card>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Dòng thời gian</h5>
              <div className="booking-timeline">
                {booking.timeline.map((event, index) => (
                  <div className="booking-timeline-item" key={`${event.status}-${index}`}>
                    <span className={`booking-timeline-dot status-${event.status.toLowerCase()}`} />
                    <div>
                      <div className="fw-semibold">{event.label}</div>
                      <small className="text-muted">{displayDateTime(event.at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Thao tác</h5>
              {canPay && (
                <Button
                  as={Link}
                  to={`/bookings/deposit?bookingId=${booking.id}`}
                  className="w-100 mb-2"
                >
                  Thanh toán tiền cọc
                </Button>
              )}
              {canCancel && (
                <Button
                  as={Link}
                  to={`/bookings/${booking.id}/cancel`}
                  variant="outline-danger"
                  className="w-100"
                >
                  Hủy đặt phòng
                </Button>
              )}
              {!canPay && !canCancel && (
                <p className="text-muted mb-0">
                  Không có thao tác nào khả dụng cho trạng thái này.
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
