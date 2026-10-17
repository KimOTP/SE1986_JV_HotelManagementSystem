import { useState, useMemo } from 'react';
import { Card, Button, Modal, Form, Row, Col, Badge, Pagination } from 'react-bootstrap';
import { mockFeedbacks as initialFeedbacks } from '../mocks/mockData';

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  
  // FORM & SEARCH STATE
  const [formData, setFormData] = useState({ rating: 'ALL', status: 'ALL' });
  const [searchParams, setSearchParams] = useState({ rating: 'ALL', status: 'ALL' });

  // PAGING
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // MODAL
  const [showModal, setShowModal] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(formData);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const empty = { rating: 'ALL', status: 'ALL' };
    setFormData(empty);
    setSearchParams(empty);
    setCurrentPage(1);
  };

  // LỌC
  const filteredFeedbacks = useMemo(() => {
    let result = [...feedbacks];
    if (searchParams.rating !== 'ALL') result = result.filter(f => f.rating === Number(searchParams.rating));
    if (searchParams.status !== 'ALL') result = result.filter(f => f.status === searchParams.status);
    return result;
  }, [feedbacks, searchParams]);

  // PHÂN TRANG
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFeedbacks = filteredFeedbacks.slice(indexOfFirstItem, indexOfLastItem);

  const openReply = (id) => { setCurrentId(id); setReplyText(''); setShowModal(true); };
  const handleReply = () => {
    setFeedbacks((prev) => prev.map((f) => 
      f.id === currentId ? { ...f, reply: replyText, status: 'REPLIED' } : f
    ));
    setShowModal(false);
  };

  return (
    <div>
      <h2 className="mb-4">Feedback Management</h2>

      {/* BỘ LỌC */}
      <Form onSubmit={handleSearch} className="mb-4 g-2 bg-light p-3 rounded border">
        <Row className="align-items-end">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Đánh giá (Sao)</Form.Label>
              <Form.Select name="rating" value={formData.rating} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="5">5 Sao</option>
                <option value="4">4 Sao</option>
                <option value="3">3 Sao</option>
                <option value="2">2 Sao</option>
                <option value="1">1 Sao</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Trạng thái phản hồi</Form.Label>
              <Form.Select name="status" value={formData.status} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chưa phản hồi</option>
                <option value="REPLIED">Đã phản hồi</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex gap-2">
            <Button type="submit" variant="primary" className="w-100 fw-semibold">Tìm kiếm</Button>
            <Button type="button" variant="outline-secondary" className="w-100" onClick={handleReset}>Reset</Button>
          </Col>
        </Row>
      </Form>

      {/* DANH SÁCH CARD */}
      {currentFeedbacks.length === 0 ? (
        <div className="text-center py-5 text-muted bg-light rounded border">Không tìm thấy feedback nào phù hợp.</div>
      ) : (
        currentFeedbacks.map((f) => (
          <Card key={f.id} className="mb-3 shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <Card.Title className="fw-bold mb-1">{f.guestName}</Card.Title>
                  <small className="text-muted">Ngày gửi: {f.createdAt}</small>
                </div>
                <div className="text-end">
                  <div className="text-warning fw-bold mb-1">Đánh giá: {f.rating}/5</div>
                  <Badge bg={f.status === 'REPLIED' ? 'success' : 'warning'} text={f.status === 'PENDING' ? 'dark' : 'white'}>
                    {f.status === 'REPLIED' ? 'Đã phản hồi' : 'Chờ xử lý'}
                  </Badge>
                </div>
              </div>
              <Card.Text className="mb-3 p-2 bg-light rounded border">{f.comment}</Card.Text>
              
              {f.reply ? (
                <div className="border-start border-3 border-primary ps-3 py-1">
                  <small className="text-primary fw-bold d-block mb-1">Phản hồi từ Quản lý:</small>
                  <span className="text-muted">{f.reply}</span>
                </div>
              ) : (
                <Button size="sm" variant="primary" onClick={() => openReply(f.id)}>Phản hồi ngay</Button>
              )}
            </Card.Body>
          </Card>
        ))
      )}

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-4">
          <span className="text-muted small">Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredFeedbacks.length)} / {filteredFeedbacks.length} feedback</span>
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
        <Modal.Header closeButton><Modal.Title>Phản hồi khách hàng</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Control as="textarea" rows={4} placeholder="Nhập nội dung phản hồi..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleReply}>Gửi phản hồi</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FeedbackManagement;