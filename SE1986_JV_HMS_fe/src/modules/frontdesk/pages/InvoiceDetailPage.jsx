import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { frontdeskApi } from '../api/frontdeskApi';
import InvoiceSummary, { InvoiceStatusBadge } from '../components/InvoiceSummary';
import { apiError, currency, PAYMENT_METHODS } from '../utils/frontdeskUtils';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [method, setMethod] = useState('CASH');
  useEffect(() => {
    let active = true;
    frontdeskApi.getInvoice(id)
      .then((data) => { if (active) { setInvoice(data); setError(''); } })
      .catch((e) => { if (active) setError(apiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const pay = async () => {
    if (!window.confirm(`Xác nhận đã nhận đủ tiền và trả phòng cho hóa đơn ${id}?`)) return;
    setBusy(true);
    try { setInvoice(await frontdeskApi.payInvoice(id, method)); setError(''); }
    catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await frontdeskApi.deleteInvoice(id); navigate('/frontdesk/invoices'); }
    catch (e) { setError(apiError(e)); setDeleteOpen(false); }
    finally { setBusy(false); }
  };
  return <div><div className="d-flex justify-content-between align-items-center mb-3"><div><Link to="/frontdesk/invoices">← Danh sách hóa đơn</Link><h2>Hóa đơn {id} {invoice && <InvoiceStatusBadge status={invoice.status} />}</h2></div><Button variant="outline-secondary" onClick={() => window.print()}>In</Button></div>
    {error && <Alert variant="danger">{error}</Alert>}
    {invoice && <><Card className="mb-3"><Card.Body><p>Khách: <strong>{invoice.guestName}</strong> · Booking: {invoice.bookingId} · Phòng: {invoice.roomNumber}</p><p>Ngày lập: {invoice.issuedAt ? new Date(`${invoice.issuedAt}Z`).toLocaleString('vi-VN') : '—'} · Phương thức đã thu: {PAYMENT_METHODS[invoice.paymentMethod] || '—'}</p>{invoice.note && <p className="mb-0">Ghi chú: {invoice.note}</p>}</Card.Body></Card>
      <Table bordered responsive><thead><tr><th>Nội dung</th><th>Loại</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.id}><td>{item.description}</td><td>{item.type}</td><td>{item.quantity}</td><td>{currency(item.unitPrice)}</td><td>{currency(item.lineTotal)}</td></tr>)}</tbody></Table>
      <div className="row g-3"><div className="col-md-6"><InvoiceSummary totals={invoice} /></div><div className="col-md-6"><div className="d-flex gap-2 flex-wrap align-items-end">
        {invoice.status === 'ISSUED' && hasPermission('UC-D2') && <><div><Form.Label>Thanh toán còn lại</Form.Label><Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>{Object.entries(PAYMENT_METHODS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</Form.Select></div><Button variant="success" onClick={pay} disabled={busy}>{busy ? 'Đang xử lý…' : `Thu ${currency(invoice.due)} và trả phòng`}</Button></>}
        {invoice.status === 'ISSUED' && hasPermission('UC-D5') && <Button as={Link} to={`/frontdesk/invoices/${encodeURIComponent(id)}/edit`} variant="outline-primary">Sửa</Button>}
        {invoice.status === 'ISSUED' && hasPermission('UC-D6') && <Button variant="outline-danger" onClick={() => setDeleteOpen(true)}>Xóa</Button>}
      </div></div></div></>}
    <Modal show={deleteOpen} onHide={() => setDeleteOpen(false)} centered><Modal.Header closeButton><Modal.Title>Xóa hóa đơn</Modal.Title></Modal.Header><Modal.Body>Hóa đơn sẽ được xóa mềm. Chỉ hóa đơn chưa thanh toán mới được xóa.</Modal.Body><Modal.Footer><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={remove}>Xác nhận xóa</Button></Modal.Footer></Modal>
  </div>;
}
