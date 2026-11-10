import { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router';
import InvoiceForm from '../components/InvoiceForm';
import { frontdeskApi } from '../api/frontdeskApi';
import { apiError } from '../utils/frontdeskUtils';

export default function InvoiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    frontdeskApi.getInvoice(id).then((data) => { if (active) setInvoice(data); })
      .catch((e) => { if (active) setError(apiError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const save = async (payload) => {
    try { await frontdeskApi.updateInvoice(id, payload); navigate(`/frontdesk/invoices/${encodeURIComponent(id)}`); }
    catch (e) { setError(apiError(e)); }
  };
  return <div><h2>Cập nhật hóa đơn {id}</h2><p className="text-muted">Chỉ hóa đơn chưa thanh toán của khách đang lưu trú mới được sửa.</p>
    {error && <Alert variant="danger">{error}</Alert>}{loading && <p>Đang tải…</p>}
    {invoice?.status === 'ISSUED' ? <InvoiceForm defaultValues={invoice} onSubmit={save} onCancel={() => navigate(`/frontdesk/invoices/${encodeURIComponent(id)}`)} submitLabel="Lưu thay đổi" /> : !loading && invoice && <Alert variant="warning">Hóa đơn này không thể sửa. <Link to={`/frontdesk/invoices/${encodeURIComponent(id)}`}>Xem chi tiết</Link></Alert>}
  </div>;
}
