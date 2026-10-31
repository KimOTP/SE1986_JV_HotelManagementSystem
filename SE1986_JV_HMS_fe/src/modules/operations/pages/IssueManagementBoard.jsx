import { useEffect, useState } from 'react';
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
import { getDatabaseIssues } from '../api/issuesApi';
import { getIssueTypes } from '../api/issueTypesApi';
import AssignIssueModal from '../components/AssignIssueModal';
import IssueProgressModal from '../components/IssueProgressModal';
import { useAuth } from '../../../app/provider/AuthsContext';
import { PERMISSIONS, ROLES } from '../../auths/constants/authConstants';

const statuses = {
  OPEN: { label: 'Mới báo cáo', color: 'danger' },
  ASSIGNED: { label: 'Đã phân công', color: 'info' },
  IN_PROGRESS: { label: 'Đang xử lý', color: 'warning' },
  RESOLVED: { label: 'Đã xử lý', color: 'success' },
  CLOSED: { label: 'Đã đóng', color: 'secondary' },
};
const priorities = { LOW: 'Thấp', NORMAL: 'Bình thường', HIGH: 'Cao', URGENT: 'Khẩn cấp' };
const emptyFilters = { room: '', status: '', category: '' };
const pageSize = 5;
const StatusBadge = ({ status }) => (
  <Badge
    bg={statuses[status].color}
    text={['ASSIGNED', 'IN_PROGRESS'].includes(status) ? 'dark' : 'white'}
  >
    {statuses[status].label}
  </Badge>
);
// SQL DATETIME2 is stored as UTC, but the API currently returns it without an offset.
const formatDate = (value) =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN');

export default function IssueManagementBoard() {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const [formData, setFormData] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ items: [], loading: true, error: null });
  const [categories, setCategories] = useState({ items: [], error: null });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [assigningIssue, setAssigningIssue] = useState(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(null);
  const [workingIssue, setWorkingIssue] = useState(null);
  const [progressSuccess, setProgressSuccess] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getDatabaseIssues({ ...filters, page, size: pageSize }, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setResult({ items, loading: false, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            items: [],
            loading: false,
            error: 'Không tải được danh sách sự cố. Hãy kiểm tra backend và thử lại.',
          });
      });
    return () => controller.abort();
  }, [filters, page, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    getIssueTypes(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setCategories({ items, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCategories({
            items: [],
            error: 'Không tải được danh mục lọc. Bạn vẫn có thể lọc theo phòng và trạng thái.',
          });
      });
    return () => controller.abort();
  }, [attempt]);

  const beginLoading = () => {
    setResult({ items: [], loading: true, error: null });
    setSelectedIssue(null);
  };
  const applyFilters = (values) => {
    beginLoading();
    setFilters({ ...values, room: values.room.trim() });
    setPage(0);
  };
  const refresh = () => {
    beginLoading();
    setAttempt((value) => value + 1);
  };
  const changePage = (next) => {
    beginLoading();
    setPage(next);
  };
  const handleChange = (event) =>
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <h2 className="mb-0">Quản lý sự cố</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" disabled={result.loading} onClick={refresh}>
            Tải lại
          </Button>
          {hasPermission(PERMISSIONS.HOUSEKEEPING_VIEW) && (
            <Button onClick={() => navigate('/operations/report-issue')}>+ Báo cáo sự cố</Button>
          )}
        </div>
      </div>
      <Alert variant="info">
        Danh sách lấy từ database. Báo cáo mới được lưu vào SQL Server khi backend bật chế độ
        local-demo. Manager/Admin phân công sự cố mới; nhân viên được giao có thể nhận xử lý và hoàn
        tất.
      </Alert>
      {assignmentSuccess && (
        <Alert variant="success" dismissible onClose={() => setAssignmentSuccess(null)}>
          Đã phân công sự cố #{assignmentSuccess.id}, trạng thái Đã phân công. Bộ lọc hiện tại vẫn
          được giữ nguyên.
        </Alert>
      )}
      {progressSuccess && (
        <Alert variant="success" dismissible onClose={() => setProgressSuccess(null)}>
          Đã cập nhật sự cố #{progressSuccess.id}: {statuses[progressSuccess.status].label}. Bộ lọc
          hiện tại vẫn được giữ nguyên.
        </Alert>
      )}
      {result.error && (
        <Alert variant="danger">
          {result.error}{' '}
          <Button variant="outline-danger" size="sm" onClick={refresh}>
            Thử lại
          </Button>
        </Alert>
      )}
      {categories.error && <Alert variant="warning">{categories.error}</Alert>}
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(formData);
        }}
        className="mb-3 bg-light p-3 rounded border"
      >
        <Row className="align-items-end g-2">
          <Col md={3}>
            <Form.Group controlId="issue-room-filter">
              <Form.Label>Tìm theo phòng</Form.Label>
              <Form.Control
                name="room"
                placeholder="VD: 103"
                value={formData.room}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="issue-status-filter">
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select name="status" value={formData.status} onChange={handleChange}>
                <option value="">Tất cả</option>
                {Object.entries(statuses).map(([code, value]) => (
                  <option key={code} value={code}>
                    {value.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="issue-category-filter">
              <Form.Label>Danh mục</Form.Label>
              <Form.Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={!!categories.error}
              >
                <option value="">Tất cả</option>
                {categories.items.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex gap-2">
            <Button type="submit" disabled={result.loading}>
              Tìm kiếm
            </Button>
            <Button
              variant="outline-secondary"
              disabled={result.loading}
              onClick={() => {
                setFormData(emptyFilters);
                applyFilters(emptyFilters);
              }}
            >
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Form>
      <Table responsive striped bordered hover className="align-middle bg-white">
        <thead>
          <tr>
            <th>#</th>
            <th>Phòng</th>
            <th>Tiêu đề</th>
            <th>Danh mục</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {result.loading ? (
            <tr>
              <td colSpan={6} role="status">
                Đang tải sự cố...
              </td>
            </tr>
          ) : result.error ? (
            <tr>
              <td colSpan={6}>Chưa tải được dữ liệu.</td>
            </tr>
          ) : result.items.length === 0 ? (
            <tr>
              <td colSpan={6}>Không có sự cố trong trang này hoặc phù hợp bộ lọc.</td>
            </tr>
          ) : (
            result.items.map((issue, index) => (
              <tr key={issue.id}>
                <td>{page * pageSize + index + 1}</td>
                <td>{issue.roomNumber}</td>
                <td>{issue.title}</td>
                <td>{issue.category}</td>
                <td>
                  <StatusBadge status={issue.status} />
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    Chi tiết
                  </Button>
                  {hasPermission(PERMISSIONS.HOUSEKEEPING_MANAGE) && issue.status === 'OPEN' && (
                    <Button
                      className="ms-2"
                      size="sm"
                      onClick={() => {
                        setAssignmentSuccess(null);
                        setAssigningIssue(issue);
                      }}
                    >
                      Phân công
                    </Button>
                  )}
                  {hasRole(ROLES.STAFF) &&
                    hasPermission('UC-E5') &&
                    ['ASSIGNED', 'IN_PROGRESS'].includes(issue.status) && (
                      <Button
                        size="sm"
                        variant="outline-success"
                        className="ms-2"
                        onClick={() => {
                          setProgressSuccess(null);
                          setWorkingIssue(issue);
                        }}
                      >
                        {issue.status === 'ASSIGNED' ? 'Nhận xử lý' : 'Hoàn tất'}
                      </Button>
                    )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <div className="d-flex justify-content-between align-items-center">
        <span>Trang {page + 1}</span>
        <Pagination className="mb-0">
          <Pagination.Prev
            disabled={page === 0 || result.loading}
            onClick={() => changePage(page - 1)}
          />
          <Pagination.Next
            disabled={result.loading || !!result.error || result.items.length < pageSize}
            onClick={() => changePage(page + 1)}
          />
        </Pagination>
      </div>
      <Modal show={!!selectedIssue} onHide={() => setSelectedIssue(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sự cố phòng {selectedIssue?.roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIssue && (
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>Tiêu đề:</strong> {selectedIssue.title}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Danh mục:</strong> {selectedIssue.category}
              </ListGroup.Item>
              <ListGroup.Item className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                <strong>Mô tả:</strong> {selectedIssue.description}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Độ ưu tiên:</strong> {priorities[selectedIssue.priority]}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Người báo cáo:</strong> {selectedIssue.reportedBy}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Ngày báo cáo:</strong> {formatDate(selectedIssue.createdAt)}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Người xử lý:</strong> {selectedIssue.assignedTo || 'Chưa phân công'}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Trạng thái:</strong> <StatusBadge status={selectedIssue.status} />
              </ListGroup.Item>
              {selectedIssue.resolutionNote && (
                <ListGroup.Item className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                  <strong>Ghi chú xử lý:</strong> {selectedIssue.resolutionNote}
                </ListGroup.Item>
              )}
              {selectedIssue.resolvedAt && (
                <ListGroup.Item>
                  <strong>Thời gian xử lý xong:</strong> {formatDate(selectedIssue.resolvedAt)}
                </ListGroup.Item>
              )}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedIssue(null)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
      {workingIssue && (
        <IssueProgressModal
          key={workingIssue.id}
          issue={workingIssue}
          onClose={() => setWorkingIssue(null)}
          onUpdated={(response) => {
            setWorkingIssue(null);
            setProgressSuccess(response);
            refresh();
          }}
        />
      )}
      {assigningIssue && (
        <AssignIssueModal
          key={assigningIssue.id}
          issue={assigningIssue}
          onClose={() => setAssigningIssue(null)}
          onAssigned={(response) => {
            setAssigningIssue(null);
            setAssignmentSuccess(response);
            refresh();
          }}
        />
      )}
    </div>
  );
}
