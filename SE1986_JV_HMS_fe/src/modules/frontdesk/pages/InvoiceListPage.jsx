import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Pagination, Table } from 'react-bootstrap';
import { Link } from 'react-router';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { frontdeskApi } from '../api/frontdeskApi';
import { InvoiceStatusBadge } from '../components/InvoiceSummary';
import { apiError, currency, INVOICE_STATUS } from '../utils/frontdeskUtils';

export default function InvoiceListPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setRows(await frontdeskApi.getInvoices()); setError(''); }
    catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    frontdeskApi.getInvoices()
      .then((data) => { if (active) { setRows(data); setError(''); } })
      .catch((e) => { if (active) setError(apiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => rows.filter((item) => (status === 'ALL' || item.status === status) && [item.id, item.bookingId, item.guestName, item.roomNumber].some((value) => String(value || '').toLowerCase().includes(keyword.toLowerCase().trim()))), [rows, status, keyword]);
  const totalPages = Math.ceil(filtered.length / 10);
  const visible = filtered.slice((page - 1) * 10, page * 10);
  return <div><div className="d-flex justify-content-between"><div><h2>Hóa đơn</h2><p className="text-muted">Dữ liệu từ database, tối đa 500 hóa đơn mới nhất.</p></div></div>
    {error && <Alert variant="danger">{error}</Alert>}
    <div className="d-flex gap-2 mb-3"><Form.Control aria-label="Tìm hóa đơn" placeholder="Mã hóa đơn, booking, khách, phòng…" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} /><Form.Select aria-label="Trạng thái" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="ALL">Tất cả</option>{Object.entries(INVOICE_STATUS).map(([code, item]) => <option value={code} key={code}>{item.label}</option>)}</Form.Select></div>
    <Table striped responsive><thead><tr><th>Mã hóa đơn</th><th>Booking</th><th>Khách</th><th>Phòng</th><th>Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      {visible.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.bookingId}</td><td>{item.guestName}</td><td>{item.roomNumber}</td><td>{currency(item.total)}</td><td><InvoiceStatusBadge status={item.status} /></td><td><Button as={Link} to={`/frontdesk/invoices/${encodeURIComponent(item.id)}`} size="sm">Xem</Button>{item.status === 'ISSUED' && hasPermission('UC-D5') && <Button as={Link} to={`/frontdesk/invoices/${encodeURIComponent(item.id)}/edit`} size="sm" variant="outline-primary" className="ms-1">Sửa</Button>}</td></tr>)}
      {!loading && visible.length === 0 && <tr><td colSpan={7} className="text-center">Không có hóa đơn phù hợp.</td></tr>}
    </tbody></Table>{loading && <p>Đang tải…</p>}
    {totalPages > 1 && <Pagination><Pagination.Prev disabled={page === 1} onClick={() => setPage(page - 1)} /><Pagination.Item active>{page} / {totalPages}</Pagination.Item><Pagination.Next disabled={page === totalPages} onClick={() => setPage(page + 1)} /></Pagination>}
  </div>;
}
