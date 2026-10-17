import { useState, useMemo } from 'react';
import { Table, Badge, Button, Form, Row, Col, Pagination, Modal, ListGroup } from 'react-bootstrap';
import { mockIssues as initialIssues } from '../mocks/mockData';

const IssueManagementBoard = () => {
  const [issues, setIssues] = useState(initialIssues);
  
  // FORM STATE
  const [formData, setFormData] = useState({ room: '', status: 'ALL', category: 'ALL' });
  // SEARCH STATE
  const [searchParams, setSearchParams] = useState({ room: '', status: 'ALL', category: 'ALL' });

  // PAGING STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // MODAL STATE
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(formData);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const empty = { room: '', status: 'ALL', category: 'ALL' };
    setFormData(empty);
    setSearchParams(empty);
    setCurrentPage(1);
  };

  // LỌC
  const filteredIssues = useMemo(() => {
    let result = [...issues];
    if (searchParams.status !== 'ALL') result = result.filter(i => i.status === searchParams.status);
    if (searchParams.category !== 'ALL') result = result.filter(i => i.category === searchParams.category);
    if (searchParams.room.trim() !== '') result = result.filter(i => i.roomNumber.includes(searchParams.room.trim()));
    return result;
  }, [issues, searchParams]);

  // PHÂN TRANG
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentIssues = filteredIssues.slice(indexOfFirstItem, indexOfLastItem);

  const handleViewMore = (issue) => { setSelectedIssue(issue); setShowModal(true); };
  const handleResolve = (id) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'RESOLVED' } : i));
    setShowModal(false);
  };

  return (
    <div>
      <h2 className="mb-4">Issue Management Board</h2>

      {/* BỘ LỌC */}
      <Form onSubmit={handleSearch} className="mb-3 g-2 bg-light p-3 rounded border">
        <Row className="align-items-end">
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Tìm theo phòng</Form.Label>
              <Form.Control type="text" name="room" placeholder="VD: 102..." value={formData.room} onChange={handleFormChange} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Trạng thái</Form.Label>
              <Form.Select name="status" value={formData.status} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Danh mục</Form.Label>
              <Form.Select name="category" value={formData.category} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Furniture">Furniture</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex gap-2">
            <Button type="submit" variant="primary" className="w-100 fw-semibold">Tìm kiếm</Button>
            <Button type="button" variant="outline-secondary" className="w-100" onClick={handleReset}>Reset</Button>
          </Col>
        </Row>
      </Form>

      {/* BẢNG */}
      <Table striped bordered hover className="align-middle">
        <thead className="table-light">
          <tr><th>#</th><th>Room</th><th>Category</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {currentIssues.length === 0 ? (
             <tr><td colSpan={5} className="text-center py-4 text-muted">Không tìm thấy sự cố nào.</td></tr>
          ) : (
            currentIssues.map((i, index) => (
              <tr key={i.id}>
                <td>{indexOfFirstItem + index + 1}</td>
                <td className="fw-semibold">{i.roomNumber}</td>
                <td>{i.category}</td>
                <td><Badge bg={i.status === 'RESOLVED' ? 'success' : i.status === 'OPEN' ? 'danger' : 'warning'}>{i.status}</Badge></td>
                <td><Button size="sm" variant="outline-primary" onClick={() => handleViewMore(i)}>Xem chi tiết</Button></td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredIssues.length)} / {filteredIssues.length} sự cố</span>
          <Pagination className="mb-0">
            <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Sự cố phòng {selectedIssue?.roomNumber}</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedIssue && (
             <ListGroup variant="flush">
               <ListGroup.Item><strong>Danh mục:</strong> {selectedIssue.category}</ListGroup.Item>
               <ListGroup.Item><strong>Mô tả:</strong> {selectedIssue.description}</ListGroup.Item>
               <ListGroup.Item><strong>Người báo cáo:</strong> {selectedIssue.reportedBy}</ListGroup.Item>
               <ListGroup.Item><strong>Ngày báo cáo:</strong> {selectedIssue.createdAt}</ListGroup.Item>
               <ListGroup.Item><strong>Người xử lý:</strong> {selectedIssue.assignedTo || 'Chưa phân công'}</ListGroup.Item>
             </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Đóng</Button>
          {selectedIssue?.status !== 'RESOLVED' && (
            <Button variant="success" onClick={() => handleResolve(selectedIssue.id)}>Đánh dấu đã xử lý</Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default IssueManagementBoard;