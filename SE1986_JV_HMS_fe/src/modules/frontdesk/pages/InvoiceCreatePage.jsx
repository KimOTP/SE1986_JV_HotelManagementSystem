import { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router';
import InvoiceForm from '../components/InvoiceForm';
import { frontdeskApi } from '../api/frontdeskApi';
import { apiError } from '../utils/frontdeskUtils';

export default function InvoiceCreatePage() {
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    frontdeskApi.getInvoiceDraft(bookingId).then((data) => { if (active) setDraft({ ...data, discount: 0, taxRate: 10, note: '' }); })
      .catch((e) => { if (active) setError(apiError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);
  const save = async (payload) => {
    try { const invoice = await frontdeskApi.createInvoice(payload); navigate(`/frontdesk/invoices/${encodeURIComponent(invoice.id)}`); }
    catch (e) { setError(apiError(e)); }
  };
  return <div><h2>Tạo hóa đơn</h2><p className="text-muted">Tiền phòng và dịch vụ đã giao được lấy từ database.</p>
    {(error || !bookingId) && <Alert variant="danger">{error || 'Thiếu mã booking. Chọn khách ở màn hình Check-out.'} <Link to="/frontdesk/check-out">Về Check-out</Link></Alert>}
    {loading && bookingId && <p>Đang tải…</p>}
    {draft && <InvoiceForm defaultValues={draft} onSubmit={save} onCancel={() => navigate('/frontdesk/check-out')} submitLabel="Tạo hóa đơn" />}
  </div>;
}
