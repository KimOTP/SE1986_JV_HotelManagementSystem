import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import {
  Bank,
  Calendar3,
  CheckCircle,
  ClockHistory,
  CreditCard2Front,
  People,
  QrCodeScan,
  ShieldCheck,
  Wallet2,
} from 'react-bootstrap-icons';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext';
import BookingError from '../components/BookingError';
import BookingStatus from '../components/BookingStatus';
import { getBookings, payBookingDeposit } from '../mocks/bookingStore';
import { displayDate, isHoldExpired, money, nightsBetween } from '../utils/bookingUtils';
import '../styles/deposit-payment.css';

// Dự án chỉ bán và thu cọc trực tuyến (Digital-First, UC-2.5). Không có
// phương thức tiền mặt tại quầy trong luồng đặt phòng của khách.
const PAYMENT_METHODS = [
  {
    id: 'BANK_TRANSFER',
    label: 'Chuyển khoản / QR ngân hàng',
    hint: 'Quét mã QR hoặc chuyển khoản, cổng thanh toán xác nhận tự động',
    icon: QrCodeScan,
    recommended: true,
  },
  {
    id: 'CREDIT_CARD',
    label: 'Thẻ quốc tế',
    hint: 'Visa, Mastercard, JCB — thanh toán ngay, không cần chờ xác nhận',
    icon: CreditCard2Front,
  },
  {
    id: 'E_WALLET',
    label: 'Ví điện tử',
    hint: 'MoMo, ZaloPay, VNPay — mở ứng dụng để xác nhận giao dịch',
    icon: Wallet2,
  },
];

const METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.id, method.label]),
);

export default function DepositPaymentPage() {
  const { hasPermission } = useAuth();
  const canPayDeposit = hasPermission('UC-C2');
  const [params] = useSearchParams();
  const [bookings, setBookings] = useState(() => getBookings());
  const [selectedId, setSelectedId] = useState(params.get('bookingId') || '');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(null);
  const [paying, setPaying] = useState(false);

  const payableBookings = bookings.filter(
    (booking) => booking.status === 'PENDING' && !isHoldExpired(booking),
  );
  const selected = bookings.find((booking) => booking.id === selectedId);
  const holdExpired = Boolean(selected && isHoldExpired(selected));
  const nights = selected
    ? nightsBetween(selected.checkIn, selected.checkOut)
    : 0;
  const remaining = selected
    ? Math.max(0, Number(selected.totalAmount) - Number(selected.depositRequired))
    : 0;

  const pay = () => {
    if (!canPayDeposit) {
      setError('Bạn không có quyền UC-C2 để thanh toán tiền cọc.');
      return;
    }
    if (!selected) {
      setError('Vui lòng chọn đặt phòng cần thanh toán.');
      return;
    }
    if (holdExpired) {
      setError(
        'Đặt phòng đã hết hạn giữ chỗ và phòng đã được nhả. Vui lòng đặt lại đơn mới.',
      );
      return;
    }

    setError('');
    setPaying(true);
    try {
      payBookingDeposit(selected.id, paymentMethod);
      setBookings(getBookings());
      setPaid({
        id: selected.id,
        amount: selected.depositRequired,
        method: paymentMethod,
      });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bookings-module deposit-page">
      <header className="hms-page-head">
        <div className="hms-page-head__main">
          <span className="hms-page-head__icon">
            <Bank aria-hidden="true" />
          </span>
          <div>
            <h1 className="hms-page-head__title">Thanh toán tiền cọc</h1>
            <p className="hms-page-head__desc">
              Giữ chỗ trực tuyến — thanh toán cọc 30% để đặt phòng được xác nhận
              ngay.
            </p>
          </div>
        </div>

        <Button as={Link} to="/bookings" variant="outline-primary">
          Đặt phòng của tôi
        </Button>
      </header>

      <BookingError error={error} />

      {paid ? (
        <section className="deposit-success">
          <span className="deposit-success__icon">
            <CheckCircle aria-hidden="true" />
          </span>
          <h2 className="deposit-success__title">Thanh toán cọc thành công</h2>
          <p className="deposit-success__desc">
            Đặt phòng <strong>{paid.id}</strong> đã được xác nhận. Hệ thống ghi
            nhận <strong>{money(paid.amount)}</strong> qua{' '}
            {METHOD_LABELS[paid.method]}.
          </p>
          <div className="deposit-success__actions">
            <Button as={Link} to={`/bookings/${paid.id}`}>
              Xem đặt phòng
            </Button>
            <Button as={Link} to="/bookings" variant="outline-primary">
              Danh sách đặt phòng
            </Button>
          </div>
        </section>
      ) : payableBookings.length === 0 ? (
        <section className="deposit-empty">
          <span className="deposit-empty__icon">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h2 className="deposit-empty__title">
            Không có đặt phòng nào chờ thanh toán
          </h2>
          <p className="deposit-empty__desc">
            Các đặt phòng của bạn đã được xác nhận, đã hủy hoặc hết hạn giữ
            chỗ. Bạn có thể tạo đặt phòng mới để tiếp tục.
          </p>
          <Button as={Link} to="/bookings/new">
            Tạo đặt phòng
          </Button>
        </section>
      ) : (
        <div className="deposit-grid">
          <section className="deposit-card">
            <h2 className="deposit-card__title">Thông tin đặt phòng</h2>

            {payableBookings.length > 1 && (
              <Form.Group className="mb-3" controlId="deposit-booking">
                <Form.Label className="deposit-label">
                  Chọn đặt phòng cần thanh toán
                </Form.Label>
                <Form.Select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  <option value="">-- Chọn đặt phòng --</option>
                  {payableBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.id} · {booking.roomTypeName} ·{' '}
                      {displayDate(booking.checkIn)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {selected ? (
              <>
                <div className="deposit-booking">
                  <div>
                    <div className="deposit-booking__code">{selected.id}</div>
                    <div className="deposit-booking__type">
                      {selected.roomTypeName} · {selected.rooms || 1} phòng
                    </div>
                  </div>
                  <BookingStatus status={selected.status} />
                </div>

                <dl className="deposit-info">
                  <div>
                    <dt>
                      <Calendar3 aria-hidden="true" /> Nhận / trả phòng
                    </dt>
                    <dd>
                      {displayDate(selected.checkIn)} –{' '}
                      {displayDate(selected.checkOut)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <People aria-hidden="true" /> Số khách
                    </dt>
                    <dd>{selected.guests} khách</dd>
                  </div>
                  <div>
                    <dt>Thời gian lưu trú</dt>
                    <dd>{nights} đêm</dd>
                  </div>
                </dl>

                <div className="deposit-breakdown">
                  <div className="deposit-breakdown__row">
                    <span>Tổng tiền đặt phòng</span>
                    <strong>{money(selected.totalAmount)}</strong>
                  </div>
                  <div className="deposit-breakdown__row">
                    <span>Tiền cọc (30%)</span>
                    <strong>{money(selected.depositRequired)}</strong>
                  </div>
                  <div className="deposit-breakdown__row deposit-breakdown__row--muted">
                    <span>Còn lại thanh toán khi nhận phòng</span>
                    <span>{money(remaining)}</span>
                  </div>
                  <div className="deposit-breakdown__due">
                    <span>Thanh toán hôm nay</span>
                    <strong>{money(selected.depositRequired)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className="deposit-hint">
                Chọn một đặt phòng đang chờ để xem số tiền cọc cần thanh toán.
              </p>
            )}
          </section>

          <section className="deposit-card">
            <div className="deposit-card__head">
              <h2 className="deposit-card__title">Phương thức thanh toán</h2>
              <span className="deposit-online-badge">Trực tuyến</span>
            </div>

            <div
              className="deposit-methods"
              role="radiogroup"
              aria-label="Phương thức thanh toán trực tuyến"
            >
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const active = paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`deposit-method${active ? ' is-active' : ''}`}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <span className="deposit-method__icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="deposit-method__body">
                      <span className="deposit-method__label">
                        {method.label}
                        {method.recommended && (
                          <span className="deposit-method__tag">
                            Khuyến nghị
                          </span>
                        )}
                      </span>
                      <span className="deposit-method__hint">
                        {method.hint}
                      </span>
                    </span>
                    <span
                      className={`deposit-method__radio${active ? ' is-checked' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>

            {holdExpired && (
              <div className="deposit-note deposit-note--warning">
                <ClockHistory aria-hidden="true" />
                <span>
                  Đơn đã hết hạn giữ chỗ sau 15 phút chưa thanh toán. Phòng đã
                  được nhả cho khách khác — vui lòng tạo đặt phòng mới.
                </span>
              </div>
            )}

            <div className="deposit-note">
              <ShieldCheck aria-hidden="true" />
              <span>
                Chỉ hỗ trợ thanh toán trực tuyến. HMS không thu tiền mặt tại quầy
                cho đặt phòng online.
              </span>
            </div>

            <p className="deposit-demo">
              Môi trường demo: chưa kết nối cổng thanh toán, không phát sinh giao
              dịch thật.
            </p>

            <Button
              className="w-100 deposit-cta"
              onClick={pay}
              disabled={!canPayDeposit || paying || !selected || holdExpired}
            >
              {paying
                ? 'Đang xử lý giao dịch…'
                : holdExpired
                  ? 'Đơn đã hết hạn giữ chỗ'
                  : selected
                    ? `Thanh toán ${money(selected.depositRequired)}`
                    : 'Chọn đặt phòng để thanh toán'}
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
