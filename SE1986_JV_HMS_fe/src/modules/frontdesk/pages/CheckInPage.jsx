import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import { frontdeskApi } from '../api/frontdeskApi';
import { apiError, currency } from '../utils/frontdeskUtils';
import { ReservationStatusBadge } from '../components/InvoiceSummary';

export default function CheckInPage() {
  const [rows, setRows] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [guests, setGuests] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { setRows(await frontdeskApi.getCheckInCandidates({ todayOnly, keyword })); setError(''); }
    catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }, [todayOnly, keyword]);
  useEffect(() => {
    let active = true;
    frontdeskApi.getCheckInCandidates({ todayOnly, keyword })
      .then((data) => { if (active) { setRows(data); setError(''); } })
      .catch((e) => { if (active) setError(apiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [todayOnly, keyword]);
  const open = (booking) => {
    setSelected(booking); setError(''); setNote('');
    setGuests(booking.rooms.map((room) => ({ bookingRoomId: room.bookingRoomId, roomNumber: room.roomNumber, fullName: booking.guestName, idNumber: '', documentType: 'CCCD' })));
  };
  const updateGuest = (index, field, value) => setGuests((current) => current.map((guest, i) => i === index ? { ...guest, [field]: value } : guest));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await frontdeskApi.checkInReservation(selected.id, { roomGuests: guests, note });
      setNotice(`Đã check-in booking ${selected.id}.`); setSelected(null); await load();
    } catch (e) { setError(apiError(e)); }
    finally { setSaving(false); }
  };
  return <div><h2>Check-in</h2><p className="text-muted">Booking đã xác nhận, đủ tiền cọc và phòng sẵn sàng.</p>
    {error && <Alert variant="danger">{error}</Alert>}{notice && <Alert variant="success">{notice}</Alert>}
    <div className="d-flex gap-3 align-items-center mb-3"><Form.Control aria-label="Tìm booking" placeholder="Mã booking, khách, phòng…" value={keyword} onChange={(e) => setKeyword(e.target.value)} /><Form.Check type="switch" label="Chỉ khách đến hôm nay" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} /></div>
    <Table striped responsive><thead><tr><th>Booking</th><th>Khách</th><th>Phòng</th><th>Ngày ở</th><th>Cọc đã thu</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.guestName}</td><td>{r.rooms?.map((room) => room.roomNumber).join(', ')}</td><td>{r.checkIn} – {r.checkOut}</td><td>{currency(r.depositPaid)} / {currency(r.depositRequired)}</td><td><ReservationStatusBadge status={r.status} /></td><td><Button size="sm" onClick={() => open(r)}>Check-in</Button></td></tr>)}
      {!loading && rows.length === 0 && <tr><td colSpan={7} className="text-center">Không có booking phù hợp.</td></tr>}
    </tbody></Table>{loading && <p>Đang tải…</p>}
    <Modal show={!!selected} onHide={() => setSelected(null)} centered size="lg"><Form onSubmit={submit}><Modal.Header closeButton><Modal.Title>Check-in {selected?.id}</Modal.Title></Modal.Header><Modal.Body>
      {guests.map((guest, index) => <div key={guest.bookingRoomId} className="border rounded p-3 mb-3"><strong>Phòng {guest.roomNumber}</strong><div className="row g-2 mt-1">
        <div className="col-md-4"><Form.Label>Khách chính</Form.Label><Form.Control required maxLength={150} value={guest.fullName} onChange={(e) => updateGuest(index, 'fullName', e.target.value)} /></div>
        <div className="col-md-3"><Form.Label>Loại giấy tờ</Form.Label><Form.Select value={guest.documentType} onChange={(e) => updateGuest(index, 'documentType', e.target.value)}><option value="CCCD">CCCD</option><option value="PASSPORT">Hộ chiếu</option><option value="OTHER">Khác</option></Form.Select></div>
        <div className="col-md-5"><Form.Label>Số giấy tờ</Form.Label><Form.Control required minLength={3} maxLength={50} pattern={guest.documentType === 'CCCD' ? '[0-9]{9,12}' : undefined} value={guest.idNumber} onChange={(e) => updateGuest(index, 'idNumber', e.target.value)} /></div>
      </div></div>)}<Form.Label>Ghi chú</Form.Label><Form.Control as="textarea" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
    </Modal.Body><Modal.Footer><Button variant="secondary" onClick={() => setSelected(null)}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang xử lý…' : 'Xác nhận'}</Button></Modal.Footer></Form></Modal>
  </div>;
}
