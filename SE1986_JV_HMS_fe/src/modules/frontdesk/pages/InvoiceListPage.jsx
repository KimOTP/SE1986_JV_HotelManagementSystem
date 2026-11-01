import { useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Pagination, Row, Table } from 'react-bootstrap';
import { CashCoin, Eye, Pencil, Trash } from 'react-bootstrap-icons';
import { Link } from 'react-router';
import { deleteInvoice, getInvoices, payInvoice } from '../mocks/frontdeskStore';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { InvoiceStatusBadge } from '../components/InvoiceSummary';
import { INVOICE_STATUS, calcTotals, currency } from '../utils/frontdeskUtils';

const EMPTY = { keyword: '', status: 'ALL' };

// Invoice list + UC-D6: Delete Invoice (confirm modal)
export default function InvoiceListPage() {
  const { hasPermission } = useAuth();
  const canManageInvoices = hasPermission('UC-D5');
  const canDeleteInvoices = hasPermission('UC-D6');
  const canViewInvoices = hasPermission('UC-D4');
  const [invoices, setInvoices] = useState(getInvoices);
  const [formData, setFormData] = useState(EMPTY);
  const [searchParams, setSearchParams] = useState(EMPTY);
  const [currentPage, setCurrentPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [notice, setNotice] = useState('');
  const itemsPerPage = 5;

  const filtered = useMemo(() => {
    const k = searchParams.keyword.trim().toLowerCase();
    return invoices.filter(
      (i) =>
        (searchParams.status === 'ALL' || i.status === searchParams.status) &&
        (!k || [i.id, i.guestName, i.roomNumber, i.bookingId || ''].some((v) => v.toLowerCase().includes(k))),
    );
  }, [invoices, searchParams]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const last = currentPage * itemsPerPage;
  const first = last - itemsPerPage;
  const current = filtered.slice(first, last);

  const handleSearch = (e) => { e.preventDefault(); setSearchParams(formData); setCurrentPage(1); };
  const handleReset = () => { setFormData(EMPTY); setSearchParams(EMPTY); setCurrentPage(1); };

  const confirmDelete = () => {
    deleteInvoice(toDelete.id);
    setInvoices(getInvoices());
    setNotice(`Đã xóa hóa đơn ${toDelete.id}.`);
    setToDelete(null);
    setCurrentPage(1);
    setTimeout(() => setNotice(''), 4000);
  };

  const handlePay = (inv) => {
    if (!window.confirm(`Xác nhận khách đã thanh toán hóa đơn ${inv.id}?`)) return;
    payInvoice(inv.id);
    setInvoices(getInvoices());
    setNotice(`Hóa đơn ${inv.id} đã được thanh toán.`);
    setTimeout(() => setNotice(''), 4000);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">Quản lý hóa đơn</h2>
          <p className="text-muted mb-0">
            {canManageInvoices
              ? 'Hóa đơn được tự sinh khi trả phòng. Tại đây bạn có thể xem và quản lý theo quyền được cấp.'
              : 'Xem thông tin hóa đơn lưu trú của bạn.'}
          </p>
        </div>
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}

      <Form onSubmit={handleSearch} className="mb-3 g-2 bg-light p-3 rounded border">
        <Row className="align-items-end">
          <Col md={5}>
            <Form.Label className="small mb-1 fw-semibold">Tìm kiếm</Form.Label>
            <Form.Control
              placeholder="Mã hóa đơn, tên khách, số phòng, mã booking..."
              value={formData.keyword}
              onChange={(e) => setFormData((p) => ({ ...p, keyword: e.target.value }))}
            />
          </Col>
          <Col md={3}>
            <Form.Label className="small mb-1 fw-semibold">Trạng thái</Form.Label>
            <Form.Select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}>
              <option value="ALL">Tất cả</option>
              {Object.entries(INVOICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Form.Select>
          </Col>
          <Col md={4} className="d-flex gap-2">
            <Button type="submit" variant="primary" className="w-100 fw-semibold">Tìm kiếm</Button>
            <Button type="button" variant="outline-secondary" className="w-100" onClick={handleReset}>Reset</Button>
          </Col>
        </Row>
      </Form>

      <Table striped bordered hover responsive className="align-middle">
        <thead className="table-light">
          <tr>
            <th>Mã HĐ</th><th>Khách hàng</th><th>Phòng</th><th>Ngày lập</th>
            <th className="text-end">Tổng cộng</th><th>Trạng thái</th><th style={{ width: 260 }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {current.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-4 text-muted">Không tìm thấy hóa đơn nào.</td></tr>
          ) : (
            current.map((i) => (
              <tr key={i.id}>
                <td className="fw-semibold">{i.id}</td>
                <td>{i.guestName}</td>
                <td>{i.roomNumber}</td>
                <td>{i.issuedAt}</td>
                <td className="text-end">{currency(calcTotals(i).total)}</td>
                <td><InvoiceStatusBadge status={i.status} /></td>
                <td>
                  <div className="d-flex gap-1">
                    {canViewInvoices && <Button as={Link} to={`/frontdesk/invoices/${i.id}`} size="sm" variant="outline-primary" title="Xem"><Eye /></Button>}
                    {(canManageInvoices || canDeleteInvoices) && (
                      <>
                        {canManageInvoices && i.status !== 'PAID' && (
                          <Button size="sm" variant="success" title="Thanh toán" onClick={() => handlePay(i)}><CashCoin /> Thanh toán</Button>
                        )}
                        {canManageInvoices && <Button as={Link} to={`/frontdesk/invoices/${i.id}/edit`} size="sm" variant="outline-secondary" title="Sửa"><Pencil /></Button>}
                        {canDeleteInvoices && <Button size="sm" variant="outline-danger" title="Xóa" onClick={() => setToDelete(i)}><Trash /></Button>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">
            Hiển thị {first + 1} - {Math.min(last, filtered.length)} / {filtered.length} hóa đơn
          </span>
          <Pagination className="mb-0">
            <Pagination.Prev onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}

      <Modal show={canDeleteInvoices && !!toDelete} onHide={() => setToDelete(null)} centered>
        <Modal.Header closeButton><Modal.Title>Xóa hóa đơn</Modal.Title></Modal.Header>
        <Modal.Body>
          Bạn có chắc muốn xóa hóa đơn <strong>{toDelete?.id}</strong> của khách <strong>{toDelete?.guestName}</strong>?
          {toDelete?.status === 'PAID' && (
            <Alert variant="warning" className="mt-3 mb-0">Hóa đơn này đã thanh toán. Việc xóa không thể hoàn tác.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setToDelete(null)}>Hủy</Button>
          <Button variant="danger" onClick={confirmDelete}>Xóa hóa đơn</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
