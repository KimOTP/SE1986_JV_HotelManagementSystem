import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Table,
  Badge,
  Button,
  Form,
  Row,
  Col,
  Pagination,
  Modal,
  ListGroup,
  Alert,
} from 'react-bootstrap';
import { getDemoIssues, resolveDemoIssue } from '../mocks/issueStore';
// Import Auth Context và Constants để phân quyền
import { useAuth } from '../../../app/provider/AuthsContext';
import { PERMISSIONS } from '../../auths/constants/authConstants';

const IssueManagementBoard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Kiểm tra quyền: Chỉ Manager/Admin mới có quyền MANAGE
  const canManage = hasPermission(PERMISSIONS.HOUSEKEEPING_MANAGE);
  // Kiểm tra quyền: Ai có quyền xem thì mới được tạo (Lễ tân được tạo)
  const canCreate = hasPermission(PERMISSIONS.HOUSEKEEPING_VIEW);

  const [initialData] = useState(() => {
    try {
      return { issues: getDemoIssues(), error: null };
    } catch {
      return { issues: [], error: 'Không thể đọc dữ liệu sự cố demo trong trình duyệt.' };
    }
  });
  const [issues, setIssues] = useState(initialData.issues);
  const [storageError, setStorageError] = useState(initialData.error);

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

  const handleFormChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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

  // LỌC DỮ LIỆU
  const filteredIssues = useMemo(() => {
    let result = [...issues];
    if (searchParams.status !== 'ALL')
      result = result.filter((i) => i.status === searchParams.status);
    if (searchParams.category !== 'ALL')
      result = result.filter((i) => i.category === searchParams.category);
    if (searchParams.room.trim() !== '')
      result = result.filter((i) => i.roomNumber.includes(searchParams.room.trim()));
    return result;
  }, [issues, searchParams]);

  // PHÂN TRANG
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentIssues = filteredIssues.slice(indexOfFirstItem, indexOfLastItem);

  // HÀM XEM CHI TIẾT
  const handleViewMore = (issue) => {
    setSelectedIssue(issue);
    setShowModal(true);
  };

  // HÀM ĐÁNH DẤU ĐÃ XỬ LÝ
  const handleResolve = (id) => {
    if (!canManage) return;
    try {
      setIssues(resolveDemoIssue(id));
      setStorageError(null);
      setShowModal(false);
      setCurrentPage(1);
    } catch {
      setStorageError('Không thể lưu trạng thái. Vui lòng thử lại.');
    }
  };

  return (
    <div>
      {/* HEADER: TIÊU ĐỀ + NÚT BÁO CÁO */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Quản lý sự cố</h2>

        {/* Chỉ hiện nút Báo cáo nếu có quyền Tạo */}
        {canCreate && (
          <Button variant="primary" onClick={() => navigate('/operations/report-issue')}>
            + Báo cáo sự cố mới
          </Button>
        )}
      </div>

      {/* THÔNG BÁO QUYỀN HẠN (Dành cho Lễ tân hoặc người chỉ có quyền View) */}
      {!canManage && (
        <Alert variant="info" className="py-2 mb-3 shadow-sm">
          <small>
            <strong>Chế độ Xem (View):</strong> Bạn có thể theo dõi và tạo báo cáo sự cố. Chỉ có
            Quản lý (Manager/Admin) mới có quyền cập nhật trạng thái "Đã xử lý".
          </small>
        </Alert>
      )}

      <Alert variant="secondary">
        Dữ liệu demo được lưu trên trình duyệt này, chưa kết nối máy chủ.
      </Alert>
      {storageError && <Alert variant="danger">{storageError}</Alert>}

      {/* BỘ LỌC */}
      <Form onSubmit={handleSearch} className="mb-3 g-2 bg-light p-3 rounded border">
        <Row className="align-items-end">
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Tìm theo phòng</Form.Label>
              <Form.Control
                type="text"
                name="room"
                placeholder="VD: 102..."
                value={formData.room}
                onChange={handleFormChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Trạng thái</Form.Label>
              <Form.Select name="status" value={formData.status} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="OPEN">Mới báo cáo</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="RESOLVED">Đã xử lý</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Danh mục</Form.Label>
              <Form.Select name="category" value={formData.category} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                {[...new Set(issues.map((issue) => issue.category))].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex gap-2">
            <Button type="submit" variant="primary" className="w-100 fw-semibold">
              Tìm kiếm
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              className="w-100"
              onClick={handleReset}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Form>

      {/* BẢNG DỮ LIỆU */}
      <Table striped bordered hover className="align-middle bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Phòng</th>
            <th>Danh mục</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {currentIssues.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-4 text-muted">
                Không tìm thấy sự cố nào.
              </td>
            </tr>
          ) : (
            currentIssues.map((i, index) => (
              <tr key={i.id}>
                <td>{indexOfFirstItem + index + 1}</td>
                <td className="fw-semibold">{i.roomNumber}</td>
                <td>{i.category}</td>
                <td>
                  <Badge
                    bg={
                      i.status === 'RESOLVED'
                        ? 'success'
                        : i.status === 'OPEN'
                          ? 'danger'
                          : 'warning'
                    }
                    text={i.status === 'IN_PROGRESS' ? 'dark' : 'white'}
                  >
                    {i.status === 'OPEN'
                      ? 'Mới báo cáo'
                      : i.status === 'IN_PROGRESS'
                        ? 'Đang xử lý'
                        : 'Đã xử lý'}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-2 justify-content-start">
                    <Button size="sm" variant="outline-primary" onClick={() => handleViewMore(i)}>
                      Chi tiết
                    </Button>

                    {/* Nút Đã xử lý (Chỉ hiện khi có quyền MANAGE và chưa xử lý) */}
                    {canManage && i.status !== 'RESOLVED' && (
                      <Button size="sm" variant="success" onClick={() => handleResolve(i.id)}>
                        Đã xử lý
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">
            Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredIssues.length)} /{' '}
            {filteredIssues.length} sự cố
          </span>
          <Pagination className="mb-0">
            <Pagination.Prev
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            />
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item
                key={idx + 1}
                active={idx + 1 === currentPage}
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}

      {/* MODAL CHI TIẾT */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sự cố phòng {selectedIssue?.roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIssue && (
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>Danh mục:</strong> {selectedIssue.category}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Mô tả:</strong> {selectedIssue.description}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Người báo cáo:</strong> {selectedIssue.reportedBy}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Ngày báo cáo:</strong> {selectedIssue.createdAt}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Người xử lý:</strong> {selectedIssue.assignedTo || 'Chưa phân công'}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Trạng thái:</strong>{' '}
                <Badge
                  bg={
                    selectedIssue.status === 'RESOLVED'
                      ? 'success'
                      : selectedIssue.status === 'OPEN'
                        ? 'danger'
                        : 'warning'
                  }
                  text={selectedIssue.status === 'IN_PROGRESS' ? 'dark' : 'white'}
                >
                  {selectedIssue.status === 'OPEN'
                    ? 'Mới báo cáo'
                    : selectedIssue.status === 'IN_PROGRESS'
                      ? 'Đang xử lý'
                      : 'Đã xử lý'}
                </Badge>
              </ListGroup.Item>
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
          {/* Nút Đánh dấu trong Modal cũng phải check quyền */}
          {canManage && selectedIssue?.status !== 'RESOLVED' && (
            <Button variant="success" onClick={() => handleResolve(selectedIssue.id)}>
              Đánh dấu đã xử lý
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default IssueManagementBoard;
