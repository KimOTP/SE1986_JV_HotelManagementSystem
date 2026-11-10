import { useEffect, useState } from 'react';
import { Alert, Button, Card, Modal, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { frontdeskApi } from '../api/frontdeskApi';
import InvoiceSummary, { InvoiceStatusBadge } from '../components/InvoiceSummary';
import { apiError, currency, PAYMENT_METHODS } from '../utils/frontdeskUtils';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [payosStatus, setPayosStatus] = useState('');
  const [recheck, setRecheck] = useState(0);
  const returnedFromPayos = searchParams.get('payos') === '1';
  useEffect(() => {
    let active = true;
    frontdeskApi.getInvoice(id)
      .then((data) => { if (active) { setInvoice(data); setError(''); } })
      .catch((e) => { if (active) setError(apiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  // After payOS redirects back, poll until the transfer is confirmed (up to 2 minutes).
  useEffect(() => {
    if (!returnedFromPayos) return undefined;
    let active = true;
    let timer;
    const checkUntil = Date.now() + 120_000;
    const check = async () => {
      try {
        const result = await frontdeskApi.verifyInvoicePayos(id);
        if (!active) return;
        if (result.status === 'PAID' && result.invoice) {
          setInvoice(result.invoice); setPayosStatus('PAID'); setError('');
          return;
        }
        if (['CANCELLED', 'EXPIRED'].includes(result.status)) { setPayosStatus(result.status); return; }
        if (Date.now() >= checkUntil) { setPayosStatus('WAIT_TIMEOUT'); return; }
        setPayosStatus('PENDING');
        timer = setTimeout(check, 5000);
      } catch (e) {
        if (!active) return;
        setPayosStatus('ERROR'); setError(apiError(e));
      }
    };
    check();
    return () => { active = false; clearTimeout(timer); };
  }, [id, returnedFromPayos, recheck]);
  const pay = async () => {
    const needsTransfer = Number(invoice.due) > 0;
    if (!needsTransfer && !window.confirm(`Xác nhận hoàn tất hóa đơn ${id} và trả phòng?`)) return;
    setBusy(true);
    try {
      if (needsTransfer) {
        const { checkoutUrl } = await frontdeskApi.startInvoicePayos(id);
        window.location.assign(checkoutUrl);
        return;
      }
      setInvoice(await frontdeskApi.payInvoice(id)); setError('');
    } catch (e) { setError(apiError(e)); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await frontdeskApi.deleteInvoice(id); navigate('/frontdesk/invoices'); }
    catch (e) { setError(apiError(e)); setDeleteOpen(false); }
    finally { setBusy(false); }
  };
  return <div><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="mb-0">Hóa đơn {id} {invoice && <InvoiceStatusBadge status={invoice.status} />}</h2><div className="d-flex gap-2"><Button as={Link} to="/frontdesk/invoices" variant="outline-secondary">Quay lại danh sách</Button><Button variant="outline-secondary" onClick={() => window.print()}>In</Button></div></div>
    {error && <Alert variant="danger">{error}</Alert>}
    {loading && <p className="text-muted">Đang tải hóa đơn…</p>}
    {returnedFromPayos && payosStatus === 'PAID' && <Alert variant="success">Đã nhận chuyển khoản qua payOS. Hóa đơn đã được thanh toán.</Alert>}
    {returnedFromPayos && ['PENDING', 'WAIT_TIMEOUT'].includes(payosStatus) && invoice?.status === 'ISSUED' && <Alert variant="info" className="d-flex justify-content-between align-items-center">
      <span>{payosStatus === 'PENDING' ? 'Đang chờ payOS xác nhận chuyển khoản…' : 'Chưa nhận được xác nhận từ payOS. Nếu khách đã chuyển khoản, vui lòng kiểm tra lại sau ít phút.'}</span>
      <Button size="sm" variant="outline-primary" onClick={() => setRecheck((n) => n + 1)}>Kiểm tra lại</Button></Alert>}
    {returnedFromPayos && ['CANCELLED', 'EXPIRED'].includes(payosStatus) && invoice?.status === 'ISSUED' && <Alert variant="warning">Giao dịch chuyển khoản đã bị hủy hoặc hết hạn. Bấm thanh toán để tạo mã QR mới.</Alert>}
    {invoice && <><Card className="mb-3"><Card.Body><p>Khách: <strong>{invoice.guestName}</strong> · Booking: {invoice.bookingId} · Phòng: {invoice.roomNumber}</p><p>Ngày lập: {invoice.issuedAt ? new Date(`${invoice.issuedAt}Z`).toLocaleString('vi-VN') : '—'} · Phương thức đã thu: {PAYMENT_METHODS[invoice.paymentMethod] || '—'}</p>{invoice.note && <p className="mb-0">Ghi chú: {invoice.note}</p>}</Card.Body></Card>
      <Table bordered responsive><thead><tr><th>Nội dung</th><th>Loại</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.id}><td>{item.description}</td><td>{item.type}</td><td>{item.quantity}</td><td>{currency(item.unitPrice)}</td><td>{currency(item.lineTotal)}</td></tr>)}</tbody></Table>
      <div className="row g-3"><div className="col-md-6"><InvoiceSummary totals={invoice} /></div><div className="col-md-6"><div className="d-flex gap-2 flex-wrap align-items-end">
        {invoice.status === 'ISSUED' && hasPermission('UC-D2') && <Button variant="success" onClick={pay} disabled={busy}>{busy ? 'Đang xử lý…' : Number(invoice.due) > 0 ? `Thanh toán ${currency(invoice.due)} bằng chuyển khoản (QR)` : 'Hoàn tất và trả phòng'}</Button>}
        {invoice.status === 'ISSUED' && hasPermission('UC-D5') && <Button as={Link} to={`/frontdesk/invoices/${encodeURIComponent(id)}/edit`} variant="outline-primary">Sửa</Button>}
        {invoice.status === 'ISSUED' && hasPermission('UC-D6') && <Button variant="outline-danger" onClick={() => setDeleteOpen(true)}>Xóa</Button>}
      </div></div></div></>}
    <Modal show={deleteOpen} onHide={() => setDeleteOpen(false)} centered><Modal.Header closeButton><Modal.Title>Xóa hóa đơn</Modal.Title></Modal.Header><Modal.Body>Hóa đơn sẽ được xóa mềm. Chỉ hóa đơn chưa thanh toán mới được xóa.</Modal.Body><Modal.Footer><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={remove}>Xác nhận xóa</Button></Modal.Footer></Modal>
  </div>;
}
