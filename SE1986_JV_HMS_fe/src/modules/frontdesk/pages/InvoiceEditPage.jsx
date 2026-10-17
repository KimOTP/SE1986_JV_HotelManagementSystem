import { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router';
import InvoiceForm from '../components/InvoiceForm';
import { getInvoice, updateInvoice } from '../mocks/frontdeskStore';

// UC-D5: Update Invoice
export default function InvoiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice] = useState(() => getInvoice(id));

  if (!invoice) {
    return (
      <Alert variant="danger">
        Không tìm thấy hóa đơn <strong>{id}</strong>. <Link to="/frontdesk/invoices">Về danh sách</Link>
      </Alert>
    );
  }

  const onSubmit = (data) => {
    updateInvoice(id, data);
    navigate(`/frontdesk/invoices/${id}`);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Cập nhật hóa đơn {id}</h2>
        <p className="text-muted mb-0">Chỉnh sửa thông tin, dòng chi phí và trạng thái thanh toán.</p>
      </div>
      <InvoiceForm
        defaultValues={invoice}
        onSubmit={onSubmit}
        submitLabel="Lưu thay đổi"
        onCancel={() => navigate(`/frontdesk/invoices/${id}`)}
      />
    </div>
  );
}
