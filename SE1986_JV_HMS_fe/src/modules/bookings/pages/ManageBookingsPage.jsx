import { useMemo, useState } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import { Link } from 'react-router';
import BookingStatus from '../components/BookingStatus';
import PageHeading from '../components/PageHeading';
import { getBookings } from '../mocks/bookingStore';
import { BOOKING_STATUS, displayDate, money } from '../utils/bookingUtils';

export default function ManageBookingsPage() {
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
    <div className="bookings-module booking-page">
      <PageHeading
        title="Quản lý đặt phòng"
        description="Tìm kiếm và lọc đặt phòng theo khách hàng hoặc trạng thái."
      />
      <Form
        className="booking-toolbar booking-toolbar-card"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="booking-toolbar-field booking-toolbar-field-grow">
          <Form.Label className="booking-label">
            Tìm theo mã, khách hàng, điện thoại hoặc email
          </Form.Label>
          <Form.Control
            name="keyword"
            value={filters.keyword}
            onChange={update}
            placeholder="Ví dụ: BK-2601, Nguyễn An..."
          />
        </div>
        <div className="booking-toolbar-field">
          <Form.Label className="booking-label">Trạng thái</Form.Label>
          <Form.Select name="status" value={filters.status} onChange={update}>
            <option value="ALL">Tất cả</option>
            {Object.entries(BOOKING_STATUS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="booking-toolbar-action">
          <Button
            variant="outline-secondary"
            className="w-100"
            onClick={() => setFilters({ keyword: '', status: 'ALL' })}
          >
            Xóa lọc
          </Button>
        </div>
      </Form>
      <div className="booking-table-wrap">
        <Table hover className="booking-table align-middle mb-0">
          <thead>
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
                <td colSpan={8} className="booking-empty">
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
      </div>
      <p className="booking-hint">
        Tổng cộng {filtered.length} / {bookings.length} đặt phòng demo.
      </p>
    </div>
  );
}
