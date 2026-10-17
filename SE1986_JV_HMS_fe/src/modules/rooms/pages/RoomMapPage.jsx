import { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import { ArrowClockwise } from 'react-bootstrap-icons';
import { ActiveBadge, ErrorState, LoadingState, StatusBadge } from '../components/Common';
import { STATUS_LABELS } from '../constants/roomConstants';
import { useRoomsData } from '../hooks/useRoomsData';

export default function RoomMapPage() {
  const { data, loading, error, reload } = useRoomsData();
  const [floor, setFloor] = useState('ALL'),
    [type, setType] = useState('ALL'),
    [status, setStatus] = useState('ALL'),
    [selected, setSelected] = useState(null);
  const filtered = useMemo(
    () =>
      data?.rooms.filter(
        (r) =>
          (floor === 'ALL' || String(r.floor) === floor) &&
          (type === 'ALL' || r.roomTypeId === type) &&
          (status === 'ALL' || r.operationalStatus === status),
      ) || [],
    [data, floor, type, status],
  );
  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const counts = Object.fromEntries(
    Object.keys(STATUS_LABELS).map((s) => [
      s,
      data.rooms.filter((r) => r.isActive && r.operationalStatus === s).length,
    ]),
  );
  const grouped = filtered.reduce((a, r) => {
    (a[r.floor] ??= []).push(r);
    return a;
  }, {});
  const roomType = (id) => data.roomTypes.find((t) => t.id === id)?.name || 'Không xác định';
  return (
    <div className="rooms-module">
      <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2>Sơ đồ phòng</h2>
          <p className="text-muted mb-0">
            Thống kê toàn bộ phòng đang sử dụng; danh sách bên dưới theo bộ lọc.
          </p>
        </div>
        <Button variant="outline-primary" onClick={reload}>
          <ArrowClockwise /> Làm mới
        </Button>
      </div>
      <Row className="g-3 mb-4">
        <Col>
          <Card>
            <Card.Body>
              <small>Tổng phòng vật lý</small>
              <h3>{data.rooms.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        {Object.entries(counts).map(([s, n]) => (
          <Col key={s}>
            <Card>
              <Card.Body>
                <small>{STATUS_LABELS[s]}</small>
                <h3>{n}</h3>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-2">
            <Col md={4}>
              <Form.Label>Tầng</Form.Label>
              <Form.Select value={floor} onChange={(e) => setFloor(e.target.value)}>
                <option value="ALL">Tất cả</option>
                {[...new Set(data.rooms.map((r) => r.floor))]
                  .sort((a, b) => a - b)
                  .map((f) => (
                    <option key={f}>{f}</option>
                  ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Loại phòng</Form.Label>
              <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="ALL">Tất cả</option>
                {data.roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">Tất cả</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      {filtered.length === 0 ? (
        <Card>
          <Card.Body className="text-center text-muted">Không có phòng phù hợp.</Card.Body>
        </Card>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([f, rooms]) => (
            <section key={f} className="mb-4">
              <h4>Tầng {f}</h4>
              <div className="room-map-grid">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`room-map-card status-${r.operationalStatus.toLowerCase()} ${r.isActive ? '' : 'inactive'}`}
                  >
                    <strong>Phòng {r.roomNumber}</strong>
                    <span>{roomType(r.roomTypeId)}</span>
                    <StatusBadge status={r.operationalStatus} />
                    {!r.isActive && <ActiveBadge active={false} />}
                  </button>
                ))}
              </div>
            </section>
          ))
      )}
      <div className="d-flex flex-wrap gap-3 small">
        <span>
          <i className="legend ready" /> Sẵn sàng
        </span>
        <span>
          <i className="legend occupied" /> Có khách
        </span>
        <span>
          <i className="legend dirty" /> Cần dọn
        </span>
        <span>
          <i className="legend maintenance" /> Bảo trì
        </span>
      </div>
      <Modal show={!!selected} onHide={() => setSelected(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Phòng {selected?.roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <>
              <p>
                <strong>Tầng:</strong> {selected.floor}
              </p>
              <p>
                <strong>Loại phòng:</strong> {roomType(selected.roomTypeId)}
              </p>
              <p>
                <strong>Vận hành:</strong> <StatusBadge status={selected.operationalStatus} />
              </p>
              <p>
                <strong>Sử dụng:</strong> <ActiveBadge active={selected.isActive} />
              </p>
              <p>
                <strong>Ghi chú:</strong> {selected.notes || 'Không có'}
              </p>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
