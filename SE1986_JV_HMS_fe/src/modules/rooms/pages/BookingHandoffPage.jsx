import { useEffect, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router';
import { roomsApi } from '../api/roomsApi';
import { currency, nightsBetween } from '../utils/roomUtils';
import { LoadingState } from '../components/Common';
export default function BookingHandoffPage() {
  const [p] = useSearchParams();
  const [type, setType] = useState();
  useEffect(() => {
    roomsApi.getRoomType(p.get('roomTypeId')).then(setType);
  }, [p]);
  if (!type) return <LoadingState />;
  const back = `/rooms/${type.id}?checkIn=${p.get('checkIn')}&checkOut=${p.get('checkOut')}&guests=${p.get('guests')}`;
  return (
    <Card className="mx-auto shadow-sm" style={{ maxWidth: 650 }}>
      <Card.Body className="p-4">
        <h2>Bàn giao sang Booking</h2>
        <Alert variant="info">
          Module Booking chưa có route tạo đặt phòng. Trang này chỉ giữ lựa chọn để tích hợp, chưa
          tạo booking hoặc thu tiền.
        </Alert>
        <dl className="row">
          <dt className="col-5">Loại phòng</dt>
          <dd className="col-7">{type.name}</dd>
          <dt className="col-5">Ngày lưu trú</dt>
          <dd className="col-7">
            {p.get('checkIn')} → {p.get('checkOut')}
          </dd>
          <dt className="col-5">Số khách / phòng</dt>
          <dd className="col-7">
            {p.get('guests')} / {p.get('roomCount') || 1}
          </dd>
          <dt className="col-5">Tổng dự kiến</dt>
          <dd className="col-7">
            {currency(nightsBetween(p.get('checkIn'), p.get('checkOut')) * type.basePrice)}
          </dd>
        </dl>
        <div className="d-flex gap-2">
          <Button as={Link} to={back}>
            Quay lại chi tiết
          </Button>
          <Button as={Link} to={`/rooms?${p}`} variant="outline-secondary">
            Tìm phòng khác
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
