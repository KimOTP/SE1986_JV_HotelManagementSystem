import { useEffect, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router';
import { roomsApi } from '../../rooms/api/roomsApi';
import { money, nightsBetween, roomBookingUrl } from '../utils/bookingUtils';

export default function BookingHandoffPage() {
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
    <div className="bookings-module booking-page">
      <Card className="booking-card booking-handoff">
        <Card.Body>
          <h2 className="booking-page-title">Xác nhận thông tin phòng</h2>
          <p className="booking-page-subtitle mb-4">
            Kiểm tra lựa chọn trước khi tạo yêu cầu đặt phòng.
          </p>
          <dl className="booking-info mb-4">
            <dt>Loại phòng</dt>
            <dd>{roomType.name}</dd>
            <dt>Ngày lưu trú</dt>
            <dd>
              {params.get('checkIn')} → {params.get('checkOut')} ({nights} đêm)
            </dd>
            <dt>Số khách / phòng</dt>
            <dd>
              {params.get('guests')} khách / {roomCount} phòng
            </dd>
            <dt>Tổng dự kiến</dt>
            <dd className="fw-semibold">{money(nights * roomType.basePrice * roomCount)}</dd>
          </dl>
          <Alert variant="info">
            Chọn tiếp tục sẽ tạo yêu cầu ở trạng thái chờ thanh toán. Chưa có giao dịch hay phòng
            nào được xác nhận tại bước này.
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
    </div>
  );
}
