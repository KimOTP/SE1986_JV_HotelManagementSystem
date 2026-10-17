import { useState } from 'react';
import { Alert, Button, Card, Col, Modal, Row, Table } from 'react-bootstrap';
import { ArrowLeft, CashCoin, Pencil, Printer, Trash } from 'react-bootstrap-icons';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteInvoice, getInvoice, payInvoice } from '../mocks/frontdeskStore';
import { useAuth } from '../../../app/provider/AuthsContext';
import InvoiceSummary, { InvoiceStatusBadge } from '../components/InvoiceSummary';
import { PAYMENT_METHODS, calcTotals, currency } from '../utils/frontdeskUtils';

// UC-D4: View Invoice Detail
export default function InvoiceDetailPage() {
  const { canManageInvoices } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(() => getInvoice(id));
  const [showDelete, setShowDelete] = useState(false);

  if (!invoice) {
    return (
      <Alert variant="danger">
        Không tìm thấy hóa đơn <strong>{id}</strong>.{' '}
        <Link to="/frontdesk/invoices">Về danh sách</Link>
      </Alert>
    );
  }

  const totals = calcTotals(invoice);

  const confirmDelete = () => {
    deleteInvoice(invoice.id);
    navigate('/frontdesk/invoices');
  };

  const handlePay = () => {
    if (!window.confirm(`Xác nhận khách đã thanh toán hóa đơn ${invoice.id}?`)) return;
    setInvoice(payInvoice(invoice.id));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <Button as={Link} to="/frontdesk/invoices" variant="link" className="p-0 text-decoration-none mb-1">
            <ArrowLeft /> Danh sách hóa đơn
          </Button>
          <h2 className="fw-bold mb-0">Hóa đơn {invoice.id} <InvoiceStatusBadge status={invoice.status} /></h2>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-dark" onClick={() => window.print()}><Printer /> In</Button>
          {canManageInvoices && (
            <>
              {invoice.status !== 'PAID' && (
                <Button variant="success" onClick={handlePay}><CashCoin /> Thanh toán</Button>
              )}
              <Button as={Link} to={`/frontdesk/invoices/${invoice.id}/edit`} variant="outline-primary"><Pencil /> Chỉnh sửa</Button>
              <Button variant="outline-danger" onClick={() => setShowDelete(true)}><Trash /> Xóa</Button>
            </>
          )}
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Thông tin chung</h5>
              <Row className="g-3">
                <Col sm={6}><small className="text-muted d-block">Khách hàng</small><strong>{invoice.guestName}</strong></Col>
                <Col sm={3}><small className="text-muted d-block">Phòng</small><strong>{invoice.roomNumber}</strong></Col>
                <Col sm={3}><small className="text-muted d-block">Mã booking</small><strong>{invoice.bookingId || '—'}</strong></Col>
                <Col sm={6}><small className="text-muted d-block">Ngày lập</small><strong>{invoice.issuedAt}</strong></Col>
                <Col sm={6}><small className="text-muted d-block">Phương thức thanh toán</small><strong>{PAYMENT_METHODS[invoice.paymentMethod]}</strong></Col>
                {invoice.note && <Col xs={12}><small className="text-muted d-block">Ghi chú</small>{invoice.note}</Col>}
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Chi tiết</h5>
              <Table bordered responsive className="align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Nội dung</th><th>Loại</th><th className="text-center">SL</th><th className="text-end">Đơn giá</th><th className="text-end">Thành tiền</th></tr>
                </thead>
                <tbody>
                  {invoice.items.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.description}</td>
                      <td>{i.type === 'ROOM' ? 'Phòng' : 'Dịch vụ'}</td>
                      <td className="text-center">{i.quantity}</td>
                      <td className="text-end">{currency(i.unitPrice)}</td>
                      <td className="text-end fw-semibold">{currency(i.quantity * i.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <InvoiceSummary totals={totals} />
        </Col>
      </Row>

      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
        <Modal.Header closeButton><Modal.Title>Xóa hóa đơn</Modal.Title></Modal.Header>
        <Modal.Body>Bạn có chắc muốn xóa hóa đơn <strong>{invoice.id}</strong>? Hành động này không thể hoàn tác.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Hủy</Button>
          <Button variant="danger" onClick={confirmDelete}>Xóa hóa đơn</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
