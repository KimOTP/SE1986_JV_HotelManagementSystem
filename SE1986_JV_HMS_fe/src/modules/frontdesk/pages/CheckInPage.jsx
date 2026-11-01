import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { BoxArrowInRight } from 'react-bootstrap-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TODAY, checkInReservation, getReservations } from '../mocks/frontdeskStore';
import { ReservationStatusBadge } from '../components/InvoiceSummary';
import { currency } from '../utils/frontdeskUtils';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

const schema = z.object({
  roomNumber: z.string().trim().min(1, 'Vui lòng nhập số phòng'),
  idNumber: z.string().trim().regex(/^\d{9,12}$/, 'CCCD/CMND gồm 9 - 12 chữ số'),
  note: z.string().optional(),
});

// UC-D1: Check-in Process
export default function CheckInPage() {
  const { hasPermission } = useAuth();
  const canCheckIn = hasPermission('UC-D1');
  const [reservations, setReservations] = useState(getReservations);
  const [keyword, setKeyword] = useState('');
  const [onlyToday, setOnlyToday] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const rows = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return reservations.filter(
      (r) =>
        r.status === 'CONFIRMED' &&
        (!onlyToday || r.checkIn === TODAY) &&
        (!k || [r.id, r.guestName, r.phone, r.roomNumber].some((v) => v.toLowerCase().includes(k))),
    );
  }, [reservations, keyword, onlyToday]);

  const open = (r) => {
    setSelected(r);
    reset({ roomNumber: r.roomNumber, idNumber: r.idNumber || '', note: '' });
  };

  const onSubmit = (data) => {
    checkInReservation(selected.id, data);
    setReservations(getReservations());
    setNotice(`Check-in thành công cho ${selected.guestName} - phòng ${data.roomNumber}.`);
    setSelected(null);
    setTimeout(() => setNotice(''), 4000);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Check-in</h2>
        <p className="text-muted mb-0">Làm thủ tục nhận phòng cho khách đã có booking.</p>
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}

      <Form onSubmit={(e) => e.preventDefault()} className="mb-3 bg-light p-3 rounded border">
        <Row className="align-items-end g-2">
          <Col md={6}>
            <Form.Label className="small mb-1 fw-semibold">Tìm kiếm</Form.Label>
            <Form.Control placeholder="Mã booking, tên khách, SĐT, số phòng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </Col>
          <Col md={4}>
            <Form.Check
              type="switch" id="only-today" label={`Chỉ khách đến hôm nay (${TODAY})`}
              checked={onlyToday} onChange={(e) => setOnlyToday(e.target.checked)}
            />
          </Col>
          <Col md={2}>
            <Button variant="outline-secondary" className="w-100" onClick={() => { setKeyword(''); setOnlyToday(true); }}>Reset</Button>
          </Col>
        </Row>
      </Form>

      <Table striped bordered hover responsive className="align-middle">
        <thead className="table-light">
          <tr>
            <th>Mã booking</th><th>Khách hàng</th><th>Phòng</th><th>Lưu trú</th>
            <th>Khách</th><th>Đặt cọc</th><th>Trạng thái</th><th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="text-center py-4 text-muted">Không có booking nào chờ check-in.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="fw-semibold">{r.id}</td>
                <td>{r.guestName}<div className="small text-muted">{r.phone}</div></td>
                <td>{r.roomNumber} <Badge bg="light" text="dark" className="border">{r.roomType}</Badge></td>
                <td>{r.checkIn} → {r.checkOut}</td>
                <td>{r.guests}</td>
                <td>{currency(r.deposit)}</td>
                <td><ReservationStatusBadge status={r.status} /></td>
                <td>
                  <Button size="sm" variant="primary" onClick={() => open(r)} disabled={!canCheckIn}>
                    <BoxArrowInRight /> Check-in
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={!!selected} onHide={() => setSelected(null)} centered>
        <Form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Modal.Header closeButton>
            <Modal.Title>Check-in {selected?.id}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-3">
              Khách: <strong>{selected?.guestName}</strong> · {selected?.guests} người · {selected?.checkIn} → {selected?.checkOut}
            </p>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Số phòng *</Form.Label>
              <Form.Control {...register('roomNumber')} isInvalid={!!errors.roomNumber} />
              <Form.Control.Feedback type="invalid">{errors.roomNumber?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">CCCD / CMND *</Form.Label>
              <Form.Control {...register('idNumber')} isInvalid={!!errors.idNumber} />
              <Form.Control.Feedback type="invalid">{errors.idNumber?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group>
              <Form.Label className="small fw-semibold">Ghi chú</Form.Label>
              <Form.Control as="textarea" rows={2} {...register('note')} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setSelected(null)}>Hủy</Button>
            <Button type="submit" variant="primary" disabled={!canCheckIn}>Xác nhận check-in</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
