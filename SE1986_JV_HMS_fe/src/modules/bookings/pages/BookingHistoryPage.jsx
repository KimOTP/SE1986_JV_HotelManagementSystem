import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Pagination } from 'react-bootstrap';
import {
  ArrowRepeat,
  Calendar3,
  CalendarCheck,
  CalendarPlus,
  CheckCircle,
  DoorOpen,
  HourglassSplit,
  MoonStars,
  People,
  Search,
  XCircle,
} from 'react-bootstrap-icons';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import BookingStatus from '../components/BookingStatus';
import { bookingsApi, bookingsDataSource, collectBookingPages } from '../api/bookingsApi';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  BOOKING_GROUPS,
  bookingGroup,
  canCancelBooking,
  displayDate,
  formatHoldTime,
  holdRemainingSeconds,
  isDepositSettled,
  isHoldExpired,
  money,
  nightsBetween,
} from '../utils/bookingUtils';
import '../styles/booking-history.css';

const PAGE_SIZE = 5;
const GROUP_ORDER = { UPCOMING: 0, CURRENT: 1, PAST: 2, CANCELLED: 3 };
const GROUP_ICONS = {
  ALL: CalendarCheck,
  UPCOMING: HourglassSplit,
  CURRENT: MoonStars,
  PAST: CheckCircle,
  CANCELLED: XCircle,
};

const compareBookings = (first, second) => {
  const firstGroup = GROUP_ORDER[bookingGroup(first)];
  const secondGroup = GROUP_ORDER[bookingGroup(second)];
  if (firstGroup !== secondGroup) {
    return firstGroup - secondGroup;
  }
  // Đơn sắp tới: gần ngày nhận phòng trước. Các nhóm còn lại: mới nhất trước.
  return firstGroup === GROUP_ORDER.UPCOMING
    ? first.checkIn.localeCompare(second.checkIn)
    : second.checkIn.localeCompare(first.checkIn);
};

function BookingRow({ booking, canPayDeposit, canCancel }) {
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const holdRemaining =
    booking.status === 'PENDING' ? holdRemainingSeconds(booking) : null;
  const holdExpired = booking.status === 'PENDING' && isHoldExpired(booking);

  return (
    <li className="bh-item">
      <div className="bh-item__main">
        <span className="bh-item__thumb">
          <DoorOpen aria-hidden="true" />
        </span>
        <div className="bh-item__identity">
          <div className="bh-item__code">{booking.id}</div>
          <div className="bh-item__type">
            {booking.roomTypeName || 'Đang cập nhật'} · {booking.rooms || 1} phòng
          </div>
          <div className="bh-item__status">
            <BookingStatus status={booking.status} />
            {holdRemaining !== null && (
              <span
                className={`bh-item__hold${holdExpired ? ' is-expired' : ''}`}
              >
                {holdExpired
                  ? 'Đã hết hạn giữ chỗ'
                  : `Còn ${formatHoldTime(holdRemaining)} để thanh toán cọc`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bh-item__dates">
        <span className="bh-item__date">
          <Calendar3 aria-hidden="true" />
          {displayDate(booking.checkIn)} – {displayDate(booking.checkOut)}
        </span>
        <span className="bh-item__meta">
          {nights} đêm
          <span aria-hidden="true">·</span>
          <People aria-hidden="true" />
          {booking.guests} khách
        </span>
      </div>

      <div className="bh-item__amount">
        <span className="bh-item__total">{money(booking.totalAmount)}</span>
        <span className="bh-item__deposit">
          Cọc {money(booking.depositRequired)} ·{' '}
          {isDepositSettled(booking) ? 'đã thu' : 'chưa thu'}
        </span>
      </div>

      <div className="bh-item__side">
        <div className="bh-item__actions">
          {booking.status === 'PENDING' && canPayDeposit && !holdExpired && (
            <Link
              className="btn btn-sm btn-primary"
              to={`/bookings/deposit?bookingId=${booking.id}`}
            >
              Thanh toán cọc
            </Link>
          )}
          <Link
            className="btn btn-sm btn-outline-primary"
            to={`/bookings/${booking.id}`}
          >
            Chi tiết
          </Link>
          {canCancel && canCancelBooking(booking) && (
            <Link
              className="btn btn-sm btn-outline-danger"
              to={`/bookings/${booking.id}/cancel`}
            >
              Hủy
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export default function BookingHistoryPage() {
  const { hasPermission } = useAuth();
  const canCreateBooking = hasPermission('UC-C1');
  const canSearchRooms = hasPermission('UC-B4');
  const canPayDeposit = hasPermission('UC-C2');
  const canCancel = hasPermission('UC-C4');

  const { data, loading, error, refetch } = useAsyncData(
    () => collectBookingPages(bookingsApi.listMine),
    [],
  );

  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [, setTick] = useState(0);

  const bookings = useMemo(() => data || [], [data]);

  // Đếm ngược hiển thị; khi có đơn quá 15 phút thì tải lại để nhận trạng thái EXPIRED.
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      bookings.some(
        (booking) => booking.status === 'PENDING' && isHoldExpired(booking),
      )
    ) {
      refetch();
    }
  }, [bookings, refetch]);

  const rawGroup = params.get('status') || 'ALL';
  const groupFilter = BOOKING_GROUPS.some((group) => group.key === rawGroup)
    ? rawGroup
    : 'ALL';

  const counts = useMemo(() => {
    const result = { ALL: bookings.length };
    BOOKING_GROUPS.forEach((group) => {
      result[group.key] = 0;
    });
    bookings.forEach((booking) => {
      result[bookingGroup(booking)] += 1;
    });
    return result;
  }, [bookings]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return bookings
      .filter((booking) => groupFilter === 'ALL' || bookingGroup(booking) === groupFilter)
      .filter((booking) => !text || booking.id.toLowerCase().includes(text))
      .sort(compareBookings);
  }, [bookings, groupFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const selectGroup = (key) => {
    setPage(1);
    setParams(key === 'ALL' ? {} : { status: key }, { replace: true });
  };

  const clearFilters = () => {
    setQuery('');
    setPage(1);
    setParams({}, { replace: true });
  };

  const reload = () => {
    refetch();
    setPage(1);
  };

  return (
    <div className="bookings-module bh-page">
      <header className="hms-page-head">
        <div className="hms-page-head__main">
          <span className="hms-page-head__icon">
            <CalendarCheck aria-hidden="true" />
          </span>
          <div>
            <h1 className="hms-page-head__title">Đặt phòng của tôi</h1>
            <p className="hms-page-head__desc">
              Theo dõi trạng thái và lịch sử các lần đặt phòng.
            </p>
          </div>
        </div>

        <div className="bh-head-actions">
          {canSearchRooms && (
            <Button as={Link} to="/rooms" variant="outline-primary">
              Tìm phòng
            </Button>
          )}
          {canCreateBooking && (
            <Button as={Link} to="/bookings/new">
              <CalendarPlus aria-hidden="true" />
              Tạo đặt phòng
            </Button>
          )}
        </div>
      </header>

      {bookingsDataSource !== 'api' && (
        <div className="bh-demo-note">
          <span className="bh-demo-note__icon">
            <CalendarCheck aria-hidden="true" />
          </span>
          <span>
            Đang hiển thị dữ liệu khách demo trên trình duyệt này — chưa kết nối
            tài khoản hoặc backend.
          </span>
        </div>
      )}

      <section className="bh-stats" aria-label="Tóm tắt đặt phòng theo trạng thái">
        {[
          { key: 'ALL', label: 'Tất cả đặt phòng' },
          ...BOOKING_GROUPS.map((group) => ({
            key: group.key,
            label: group.label,
          })),
        ].map((item) => {
          const Icon = GROUP_ICONS[item.key];
          const active = groupFilter === item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={`bh-stat${active ? ' is-active' : ''}`}
              onClick={() => selectGroup(item.key)}
              aria-pressed={active}
            >
              <span className="bh-stat__icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="bh-stat__body">
                <span className="bh-stat__value">{counts[item.key]}</span>
                <span className="bh-stat__label">{item.label}</span>
              </span>
            </button>
          );
        })}
      </section>

      <div className="bh-toolbar">
        <div className="bh-search">
          <Search className="bh-search__icon" aria-hidden="true" />
          <Form.Control
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã đặt phòng (VD: BK-2601)"
            aria-label="Tìm theo mã đặt phòng"
          />
        </div>

        {(query || groupFilter !== 'ALL') && (
          <button type="button" className="bh-clear" onClick={clearFilters}>
            Xóa bộ lọc
          </button>
        )}

        <span className="bh-result-meta" aria-live="polite">
          {filtered.length} đặt phòng
        </span>

        <button
          type="button"
          className="bh-reload"
          onClick={reload}
          title="Tải lại dữ liệu đặt phòng"
        >
          <ArrowRepeat aria-hidden="true" />
          <span className="d-none d-sm-inline">Tải lại</span>
        </button>
      </div>

      {loading ? (
        <div className="bh-empty" role="status">
          <span className="bh-empty__icon">
            <ArrowRepeat aria-hidden="true" />
          </span>
          <h2 className="bh-empty__title">Đang tải đặt phòng…</h2>
          <p className="bh-empty__desc">Vui lòng chờ trong giây lát.</p>
        </div>
      ) : error ? (
        <Alert
          variant="danger"
          className="d-flex flex-wrap justify-content-between align-items-center gap-3"
        >
          <span>{error}</span>
          <Button variant="outline-danger" size="sm" onClick={refetch}>
            Thử lại
          </Button>
        </Alert>
      ) : filtered.length === 0 ? (
        <div className="bh-empty">
          <span className="bh-empty__icon">
            <CalendarCheck aria-hidden="true" />
          </span>
          <h2 className="bh-empty__title">
            {query
              ? 'Không tìm thấy đặt phòng'
              : groupFilter !== 'ALL'
                ? 'Không có đặt phòng trong nhóm này'
                : 'Chưa có đặt phòng nào'}
          </h2>
          <p className="bh-empty__desc">
            {query
              ? `Không có mã đặt phòng nào khớp với “${query}”.`
              : groupFilter !== 'ALL'
                ? 'Thử chọn nhóm trạng thái khác hoặc xóa bộ lọc để xem toàn bộ đặt phòng.'
                : 'Bạn chưa có đặt phòng. Hãy tìm phòng phù hợp để bắt đầu kỳ nghỉ.'}
          </p>
          <div className="bh-empty__actions">
            {(query || groupFilter !== 'ALL') && (
              <Button variant="outline-primary" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            )}
            {canSearchRooms && (
              <Button as={Link} to="/rooms">
                Tìm phòng
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="bh-list">
            {pageItems.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                canPayDeposit={canPayDeposit}
                canCancel={canCancel}
              />
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="bh-pagination-wrap">
              <Pagination className="bh-pagination mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                />
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <Pagination.Item
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Pagination.Item>
                  ),
                )}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
