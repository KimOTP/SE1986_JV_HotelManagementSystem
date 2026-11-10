/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { roomsApi } from '../api/roomsApi';
import { currency, nightsBetween, validateSearch } from '../utils/roomUtils';
import { ErrorState, LoadingState } from '../components/Common';
import RoomGallery from '../components/RoomGallery';
export default function RoomDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null),
    [type, setType] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [availabilityError, setAvailabilityError] = useState(''),
    [availabilityAttempt, setAvailabilityAttempt] = useState(0),
    [checking, setChecking] = useState(false),
    [available, setAvailable] = useState(null);
  const availabilitySeq = useRef(0);
  const criteria = {
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    guests: params.get('guests') || '1',
  };
  const errors = validateSearch(criteria);
  const hasDates = criteria.checkIn && criteria.checkOut;
  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [t, a] = await Promise.all([roomsApi.getRoomType(id), roomsApi.getCatalog()]);
        if (live) {
          setType(t);
          setData(a);
        }
      } catch (e) {
        if (live) setError(e?.response?.data?.message || e.message);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);
  // Recheck whenever URL booking criteria changes; cleanup prevents stale responses.
  useEffect(() => {
    const requestId = ++availabilitySeq.current;
    setAvailable(null);
    setAvailabilityError('');
    if (!hasDates || Object.keys(errors).length) {
      setChecking(false);
      return;
    }
    setChecking(true);
    roomsApi
      .availability(id, criteria)
      .then((v) => requestId === availabilitySeq.current && setAvailable(v))
      .catch(
        (e) =>
          requestId === availabilitySeq.current &&
          setAvailabilityError(e?.response?.data?.message || e.message),
      )
      .finally(() => requestId === availabilitySeq.current && setChecking(false));
    return () => {
      availabilitySeq.current += 1;
    };
  }, [id, criteria.checkIn, criteria.checkOut, criteria.guests, availabilityAttempt]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!type)
    return (
      <Alert variant="warning">
        Không tìm thấy loại phòng.{' '}
        <Alert.Link as={Link} to="/rooms">
          Quay lại tìm kiếm
        </Alert.Link>
      </Alert>
    );
  if (!type.isActive)
    return (
      <Alert variant="warning">
        Loại phòng này đã ngừng kinh doanh.{' '}
        <Alert.Link as={Link} to="/rooms">
          Xem loại phòng khác
        </Alert.Link>
      </Alert>
    );
  const amenities = type.amenityIds
      .map((a) => data.amenities.find((x) => x.id === a))
      .filter(Boolean),
    nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const canBook =
    hasDates &&
    !Object.keys(errors).length &&
    available &&
    Number(criteria.guests) <= type.capacity;
  const update = (k, v) => {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    setParams(n);
  };
  const book = async () => {
    const requestId = ++availabilitySeq.current;
    setChecking(true);
    setAvailabilityError('');
    try {
      const latest = await roomsApi.availability(id, criteria);
      if (requestId !== availabilitySeq.current) return;
      if (!latest) {
        setAvailable(null);
        return;
      }
      const roomCount = Math.max(1, Number(params.get('roomCount')) || 1);
      if (latest.availableRooms < roomCount) {
        setAvailabilityError('Không đủ số phòng yêu cầu. Vui lòng tìm lại.');
        return;
      }
      navigate(
        `/rooms/booking-handoff?roomTypeId=${id}&checkIn=${criteria.checkIn}&checkOut=${criteria.checkOut}&guests=${criteria.guests}&roomCount=${roomCount}`,
      );
    } catch (e) {
      if (requestId === availabilitySeq.current)
        setAvailabilityError(e?.response?.data?.message || e.message);
    } finally {
      if (requestId === availabilitySeq.current) setChecking(false);
    }
  };
  return (
    <div className="rooms-module">
      <Button as={Link} to={`/rooms?${params}`} variant="link" className="px-0 mb-3">
        ← Quay lại tìm kiếm
      </Button>
      <Row className="g-4">
        <Col lg={7}>
          <RoomGallery images={type.images} />
        </Col>
        <Col lg={5}>
          <h1>{type.name}</h1>
          <p className="text-muted">{type.description}</p>
          <p>
            <strong>{type.capacity}</strong> khách · {type.area || '—'} m² · {type.bedType}
          </p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {amenities.map((a) => (
              <Badge bg="light" text="dark" key={a.id}>
                {a.name}
              </Badge>
            ))}
          </div>
          <h3 className="text-primary">
            {currency(type.basePrice)} <small className="fs-6 text-muted">/ đêm</small>
          </h3>
          <Card className="mt-3">
            <Card.Body>
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Label>Nhận phòng</Form.Label>
                  <Form.Control
                    type="date"
                    value={criteria.checkIn}
                    onChange={(e) => update('checkIn', e.target.value)}
                  />
                </Col>
                <Col sm={6}>
                  <Form.Label>Trả phòng</Form.Label>
                  <Form.Control
                    type="date"
                    value={criteria.checkOut}
                    onChange={(e) => update('checkOut', e.target.value)}
                  />
                </Col>
                <Col sm={6}>
                  <Form.Label>Số khách</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={criteria.guests}
                    onChange={(e) => update('guests', e.target.value)}
                  />
                </Col>
              </Row>
              {Object.values(errors).map((x) => (
                <div className="text-danger small mt-1" key={x}>
                  {x}
                </div>
              ))}
              {hasDates && nights > 0 && (
                <div className="border-top mt-3 pt-3">
                  <div>
                    {nights} đêm × {currency(type.basePrice)}
                  </div>
                  <strong>Tổng dự kiến: {currency(nights * type.basePrice)}</strong>
                </div>
              )}
              {!hasDates && (
                <Alert variant="info" className="mt-3 mb-0">
                  Chọn ngày để kiểm tra phòng trống trước khi đặt.
                </Alert>
              )}
              {checking && <div className="text-muted mt-2">Đang kiểm tra lại…</div>}
              {availabilityError && (
                <div className="mt-3">
                  <ErrorState
                    message={availabilityError}
                    onRetry={() => setAvailabilityAttempt((value) => value + 1)}
                  />
                </div>
              )}
              {hasDates &&
                !checking &&
                !availabilityError &&
                !Object.keys(errors).length &&
                !available && (
                  <Alert variant="warning" className="mt-3">
                    Đã hết phòng trong khoảng ngày này.
                  </Alert>
                )}
              <Button className="w-100 mt-3" disabled={!canBook || checking} onClick={book}>
                Đặt phòng
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
