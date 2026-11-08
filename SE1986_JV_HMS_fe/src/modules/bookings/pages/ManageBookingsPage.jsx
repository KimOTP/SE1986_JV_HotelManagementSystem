import { useState } from 'react';
import { Alert, Button, Form, Pagination, Table } from 'react-bootstrap';
import { Link } from 'react-router';
import BookingStatus from '../components/BookingStatus';
import PageHeading from '../components/PageHeading';
import { bookingsApi } from '../api/bookingsApi';
import { useAsyncData } from '../hooks/useAsyncData';
import { BOOKING_STATUS, displayDate, money } from '../utils/bookingUtils';

const PAGE_SIZE = 10;

export default function ManageBookingsPage() {
  const [filters, setFilters] = useState({ keyword: '', status: 'ALL' });
  const [applied, setApplied] = useState({ keyword: '', status: 'ALL' });
  const [page, setPage] = useState(0);

  const { data, loading, error, refetch } = useAsyncData(
    () =>
      bookingsApi.listAll({
        status: applied.status === 'ALL' ? '' : applied.status,
        keyword: applied.keyword.trim(),
        page,
        size: PAGE_SIZE,
      }),
    [applied.status, applied.keyword, page],
  );

  const bookings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const update = (event) =>
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(0);
    setApplied({ ...filters });
  };

  const clearFilters = () => {
    const reset = { keyword: '', status: 'ALL' };
    setFilters(reset);
    setApplied(reset);
    setPage(0);
  };

  return (
    <div className="bookings-module booking-page">
      <PageHeading
        title="Quản lý đặt phòng"
        description="Tìm kiếm và lọc đặt phòng theo khách hàng hoặc trạng thái."
      />
      <Form className="booking-toolbar booking-toolbar-card" onSubmit={applyFilters}>
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
          <Button type="submit" variant="primary" className="w-100">
            Tìm kiếm
          </Button>
        </div>
        <div className="booking-toolbar-action">
          <Button variant="outline-secondary" className="w-100" onClick={clearFilters}>
            Xóa lọc
          </Button>
        </div>
      </Form>

      {error && (
        <Alert
          variant="danger"
          className="d-flex flex-wrap justify-content-between align-items-center gap-3"
        >
          <span>{error}</span>
          <Button variant="outline-danger" size="sm" onClick={refetch}>
            Thử lại
          </Button>
        </Alert>
      )}

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
            {loading ? (
              <tr>
                <td colSpan={8} className="booking-empty">
                  Đang tải đặt phòng…
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="booking-empty">
                  Không tìm thấy đặt phòng.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
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

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
        <p className="booking-hint mb-0">
          Tổng cộng {total} đặt phòng · trang {page + 1}/{totalPages}
        </p>
        {totalPages > 1 && (
          <Pagination className="mb-0">
            <Pagination.Prev disabled={page === 0} onClick={() => setPage(page - 1)} />
            <Pagination.Item active>{page + 1}</Pagination.Item>
            <Pagination.Next
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            />
          </Pagination>
        )}
      </div>
    </div>
  );
}
