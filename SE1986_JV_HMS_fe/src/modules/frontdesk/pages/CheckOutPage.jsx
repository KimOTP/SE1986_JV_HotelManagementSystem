import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, ListGroup, Row } from 'react-bootstrap';
import { FileEarmarkPlus, Receipt } from 'react-bootstrap-icons';
import { Link, useNavigate } from 'react-router';
import { getInvoiceByBooking, getReservations } from '../mocks/frontdeskStore';
import { InvoiceStatusBadge } from '../components/InvoiceSummary';
import { currency } from '../utils/frontdeskUtils';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

// UC-D2: Check-out. Lists in-house guests; invoice is created on a separate page.
export default function CheckOutPage() {
  const { hasPermission } = useAuth();
  const canCheckOut = hasPermission('UC-D2');
  const navigate = useNavigate();
  const [reservations] = useState(getReservations);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const staying = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return reservations.filter(
      (r) =>
        r.status === 'CHECKED_IN' &&
        (!k || [r.id, r.guestName, r.roomNumber].some((v) => v.toLowerCase().includes(k))),
    );
  }, [reservations, keyword]);

  const selected = staying.find((r) => r.id === selectedId);
  const existingInvoice = selected ? getInvoiceByBooking(selected.id) : null;
  const nights = selected
    ? Math.max(1, Math.round((new Date(selected.checkOut) - new Date(selected.checkIn)) / 86400000))
    : 0;

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Check-out</h2>
        <p className="text-muted mb-0">
          Chọn khách đang lưu trú, sau đó tạo hóa đơn để thanh toán và trả phòng.
        </p>
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4 px-4 pb-2">
              <h5 className="fw-bold mb-3">Khách đang lưu trú ({staying.length})</h5>
              <Form.Control
                placeholder="Tìm theo tên, mã booking, số phòng..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </Card.Header>
            <ListGroup variant="flush" className="px-2 pb-2">
              {staying.length === 0 && (
                <div className="text-center text-muted py-4">Không có khách đang lưu trú.</div>
              )}
              {staying.map((r) => (
                <ListGroup.Item
                  key={r.id}
                  action
                  active={r.id === selectedId}
                  onClick={() => setSelectedId(r.id)}
                  className="rounded my-1 border-0"
                >
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">
                      Phòng {r.roomNumber} · {r.guestName}
                    </span>
                    <small>{r.id}</small>
                  </div>
                  <small>
                    Check-in: {r.actualCheckIn} · Dự kiến trả: {r.checkOut}
                  </small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col lg={7}>
          {!selected ? (
            <Alert variant="info">Chọn một khách ở danh sách bên trái để tạo hóa đơn trả phòng.</Alert>
          ) : (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between mb-3">
                  <div>
                    <h5 className="fw-bold mb-0">{selected.guestName}</h5>
                    <small className="text-muted">
                      {selected.id} · {selected.phone}
                    </small>
                  </div>
                  <div className="text-end small text-muted">
                    <div>Vào: {selected.actualCheckIn}</div>
                    <div>Dự kiến ra: {selected.checkOut}</div>
                  </div>
                </div>

                <Row className="g-3 mb-4">
                  <Col sm={4}>
                    <small className="text-muted d-block">Phòng</small>
                    <strong>
                      {selected.roomNumber} · {selected.roomType}
                    </strong>
                  </Col>
                  <Col sm={4}>
                    <small className="text-muted d-block">Đơn giá / đêm</small>
                    <strong>{currency(selected.pricePerNight)}</strong>
                  </Col>
                  <Col sm={4}>
                    <small className="text-muted d-block">Số đêm</small>
                    <strong>{nights}</strong>
                  </Col>
                </Row>

                {existingInvoice ? (
                  <Alert variant="warning" className="d-flex justify-content-between align-items-center mb-0">
                    <span>
                      Đã có hóa đơn <strong>{existingInvoice.id}</strong>{' '}
                      <InvoiceStatusBadge status={existingInvoice.status} />
                    </span>
                    <Button as={Link} to={`/frontdesk/invoices/${existingInvoice.id}`} size="sm" variant="outline-dark">
                      <Receipt /> Xem hóa đơn
                    </Button>
                  </Alert>
                ) : (
                  <Button
                    variant="primary"
                    className="w-100 fw-semibold py-2"
                    disabled={!canCheckOut}
                    onClick={() => navigate(`/frontdesk/invoices/new?bookingId=${selected.id}`)}
                  >
                    <FileEarmarkPlus /> Tạo hóa đơn
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
