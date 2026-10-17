/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useSearchParams } from 'react-router';
import { roomsApi } from '../api/roomsApi';
import { localDateString, validateSearch } from '../utils/roomUtils';
import { ErrorState, LoadingState } from '../components/Common';
import RoomCard from '../components/RoomCard';
export default function RoomSearchPage() {
  const [params, setParams] = useSearchParams();
  const defaults = {
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    guests: params.get('guests') || '1',
  };
  const [form, setForm] = useState(defaults),
    [data, setData] = useState(null),
    [results, setResults] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [errors, setErrors] = useState({});
  const seq = useRef(0);
  const criteria = useMemo(
    () => ({
      checkIn: params.get('checkIn') || '',
      checkOut: params.get('checkOut') || '',
      guests: params.get('guests') || '',
    }),
    [params],
  );
  const search = async (c) => {
    const invalid = validateSearch(c);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setResults(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const [found, all] = await Promise.all([roomsApi.search(c), roomsApi.getAll()]);
      if (id === seq.current) {
        setResults(found);
        setData(all);
      }
    } catch (e) {
      if (id === seq.current) setError(e?.response?.data?.message || e.message);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  };
  // Query string is the source of truth for direct links and browser history.
  useEffect(() => {
    if (criteria.checkIn || criteria.checkOut || criteria.guests) {
      setForm(criteria);
      search(criteria);
    }
  }, [criteria.checkIn, criteria.checkOut, criteria.guests]);
  const submit = (e) => {
    e.preventDefault();
    const invalid = validateSearch(form);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const next = new URLSearchParams(form);
    ['minPrice', 'maxPrice', 'type', 'amenity'].forEach((k) => {
      const v = params.get(k);
      if (v) next.set(k, v);
    });
    setParams(next);
  };
  const filtered = useMemo(
    () =>
      results?.filter(
        (x) =>
          (!params.get('minPrice') || x.basePrice >= Number(params.get('minPrice'))) &&
          (!params.get('maxPrice') || x.basePrice <= Number(params.get('maxPrice'))) &&
          (!params.get('type') || x.id === params.get('type')) &&
          (!params.get('amenity') || x.amenityIds.includes(params.get('amenity'))),
      ) || [],
    [results, params],
  );
  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next);
  };
  return (
    <div className="rooms-module">
      <div className="text-center mb-4">
        <h1>Tìm phòng phù hợp</h1>
        <p className="text-muted">Kiểm tra phòng trống theo ngày lưu trú</p>
      </div>
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={submit}>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Label>Ngày nhận phòng</Form.Label>
                <Form.Control
                  type="date"
                  min={localDateString()}
                  value={form.checkIn}
                  isInvalid={!!errors.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.checkIn}</Form.Control.Feedback>
              </Col>
              <Col md={3}>
                <Form.Label>Ngày trả phòng</Form.Label>
                <Form.Control
                  type="date"
                  min={form.checkIn || localDateString()}
                  value={form.checkOut}
                  isInvalid={!!errors.checkOut}
                  onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.checkOut}</Form.Control.Feedback>
              </Col>
              <Col md={3}>
                <Form.Label>Số khách</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={form.guests}
                  isInvalid={!!errors.guests}
                  onChange={(e) => setForm({ ...form, guests: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.guests}</Form.Control.Feedback>
              </Col>
              <Col md={3}>
                <Button type="submit" className="w-100" disabled={loading}>
                  Tìm kiếm
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      {results && data && (
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-2">
              <Col md>
                <Form.Label>Giá từ</Form.Label>
                <Form.Control
                  type="number"
                  value={params.get('minPrice') || ''}
                  onChange={(e) => setFilter('minPrice', e.target.value)}
                />
              </Col>
              <Col md>
                <Form.Label>Giá đến</Form.Label>
                <Form.Control
                  type="number"
                  value={params.get('maxPrice') || ''}
                  onChange={(e) => setFilter('maxPrice', e.target.value)}
                />
              </Col>
              <Col md>
                <Form.Label>Loại phòng</Form.Label>
                <Form.Select
                  value={params.get('type') || ''}
                  onChange={(e) => setFilter('type', e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {results.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md>
                <Form.Label>Tiện nghi</Form.Label>
                <Form.Select
                  value={params.get('amenity') || ''}
                  onChange={(e) => setFilter('amenity', e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {data.amenities
                    .filter((a) => a.isActive)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </Form.Select>
              </Col>
              <Col md="auto" className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    const n = new URLSearchParams(criteria);
                    setParams(n);
                  }}
                >
                  Đặt lại
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => search(criteria)} />}{' '}
      {!loading && !error && results === null && (
        <Alert variant="info">Chọn ngày nhận, ngày trả và số khách để bắt đầu tìm kiếm.</Alert>
      )}{' '}
      {!loading && !error && results && filtered.length === 0 && (
        <Alert variant="warning">Không có loại phòng phù hợp với điều kiện đã chọn.</Alert>
      )}{' '}
      {!loading && data && (
        <Row className="g-4">
          {filtered.map((t) => (
            <Col lg={4} md={6} key={t.id}>
              <RoomCard roomType={t} amenities={data.amenities} query={params.toString()} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
