import { useState } from 'react';
import { Alert, Button, Form, Table } from 'react-bootstrap';
import { Link } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import BookingStatus from '../components/BookingStatus';
import PageHeading from '../components/PageHeading';
import { DEMO_BOOKING_CUSTOMER_KEY, getBookings } from '../mocks/bookingStore';
import { BOOKING_STATUS, displayDate, money } from '../utils/bookingUtils';

export default function BookingHistoryPage() {
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
    <div className="bookings-module booking-page">
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
      <div className="booking-list-toolbar">
        <Form.Select
          className="booking-filter-select"
          aria-label="Lọc trạng thái đặt phòng"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(BOOKING_STATUS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </Form.Select>
      </div>
      <div className="booking-table-wrap">
        <Table hover className="booking-table align-middle mb-0">
          <thead>
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
                <td colSpan={isCustomerView ? 6 : 7} className="booking-empty">
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
      </div>
      <Button variant="link" onClick={() => setBookings(getBookings())} className="px-0 mt-2">
        Tải lại dữ liệu demo
      </Button>
    </div>
  );
}
