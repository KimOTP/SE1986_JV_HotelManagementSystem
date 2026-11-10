import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Table } from 'react-bootstrap';
import { Link } from 'react-router';
import { frontdeskApi } from '../api/frontdeskApi';
import { apiError, currency } from '../utils/frontdeskUtils';

export default function CheckOutPage() {
  const [rows, setRows] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    frontdeskApi.getCheckOutCandidates(keyword)
      .then((data) => { if (active) { setRows(data); setError(''); } })
      .catch((e) => { if (active) setError(apiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [keyword]);
  useEffect(() => {
    let active = true;
    frontdeskApi.getInvoices().then((data) => { if (active) setInvoices(data); }).catch((e) => { if (active) setError(apiError(e)); });
    return () => { active = false; };
  }, []);
  const invoice = invoices.find((item) => item.bookingId === selected?.id);
  return <div><h2>Check-out</h2><p className="text-muted">Tạo hóa đơn, thu phần còn lại và trả phòng.</p>
    {error && <Alert variant="danger">{error}</Alert>}
    <Form.Control className="mb-3" placeholder="Tìm booking, khách hoặc phòng…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
    <Table striped responsive><thead><tr><th>Booking</th><th>Khách</th><th>Phòng</th><th>Ngày trả</th><th></th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.guestName}</td><td>{r.rooms?.map((room) => room.roomNumber).join(', ')}</td><td>{r.checkOut}</td><td><Button size="sm" onClick={() => setSelected(r)}>Chọn</Button></td></tr>)}
      {!loading && rows.length === 0 && <tr><td colSpan={5} className="text-center">Không có khách đang lưu trú.</td></tr>}
    </tbody></Table>{loading && <p>Đang tải…</p>}
    {selected && <Card><Card.Body><h5>{selected.guestName} · {selected.id}</h5><p>Phòng: {selected.rooms?.map((room) => room.roomNumber).join(', ')} · Cọc đã thu: {currency(selected.depositPaid)}</p>
      {invoice ? <><p>Hóa đơn {invoice.id} · {invoice.status}</p><Button as={Link} to={`/frontdesk/invoices/${invoice.id}`}>Xem hóa đơn và thanh toán</Button></> : <Button as={Link} to={`/frontdesk/invoices/new?bookingId=${encodeURIComponent(selected.id)}`}>Tạo hóa đơn</Button>}
    </Card.Body></Card>}
  </div>;
}
