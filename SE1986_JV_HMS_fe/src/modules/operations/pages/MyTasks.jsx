import { useEffect, useRef, useState } from 'react';
import {
  Table,
  Badge,
  Form,
  Row,
  Col,
  Pagination,
  Button,
  Alert,
  Modal,
  ListGroup,
} from 'react-bootstrap';
import { getIssueWorkContext } from '../api/issueProgressApi';
import { getMyDatabaseTasks, updateMyTask } from '../api/myTasksApi';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { ROLES } from '../../auths/constants/authConstants';

const statuses = {
  PENDING: ['Chờ xử lý', 'secondary'],
  IN_PROGRESS: ['Đang thực hiện', 'warning'],
  COMPLETED: ['Đã hoàn thành', 'success'],
  CANCELLED: ['Đã hủy', 'dark'],
};
const types = { CLEANING: 'Dọn phòng', MAINTENANCE: 'Bảo trì' };
const priorities = { LOW: 'Thấp', NORMAL: 'Bình thường', HIGH: 'Cao', URGENT: 'Khẩn cấp' };
const defaults = { room: '', status: '', type: '' };
const size = 5;
const formatDate = (value) =>
  value
    ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN')
    : '—';
const errorMessage = (error) => {
  switch (error.response?.status) {
    case 400:
      return 'Bộ lọc hoặc tham số không hợp lệ.';
    case 403:
      return 'Công việc không được giao cho nhân viên local này hoặc thuộc khách sạn khác.';
    case 404:
      return 'Không tìm thấy công việc hoặc phòng/khách sạn đã ngừng hoạt động.';
    case 409:
      return 'Công việc đã đổi trạng thái hoặc được giao lại. Đóng hộp thoại và tải lại danh sách.';
    case 503:
      return 'Chưa bật local-demo hoặc nhân viên local không còn hoạt động.';
    default:
      return 'Chưa xác nhận được kết quả. Kiểm tra backend và tải lại danh sách trước khi thử lại.';
  }
};

export default function MyTasks() {
  const { hasRole, hasPermission } = useAuth();
  const canUpdate = hasRole(ROLES.STAFF) && hasPermission('UC-E2');
  const [draft, setDraft] = useState(defaults);
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ loading: true, items: [], context: null, error: null });
  const [detail, setDetail] = useState(null);
  const [actionTask, setActionTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [success, setSuccess] = useState(null);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const context = await getIssueWorkContext(controller.signal);
        const items = context.enabled
          ? await getMyDatabaseTasks({ ...filters, page, size }, controller.signal)
          : [];
        if (!controller.signal.aborted) setResult({ loading: false, items, context, error: null });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({ loading: false, items: [], context: null, error: errorMessage(error) });
      }
    };
    load();
    return () => controller.abort();
  }, [filters, page, attempt]);

  const loading = () => {
    setResult({ loading: true, items: [], context: null, error: null });
    setDetail(null);
  };
  const refresh = () => {
    loading();
    setAttempt((value) => value + 1);
  };
  const apply = (values) => {
    loading();
    setFilters({ ...values, room: values.room.trim() });
    setPage(0);
  };
  const changePage = (next) => {
    loading();
    setPage(next);
  };
  const handleChange = (event) =>
    setDraft((old) => ({ ...old, [event.target.name]: event.target.value }));
  const chooseAction = (task) => {
    setSaveError(null);
    setSuccess(null);
    setActionTask(task);
  };
  const perform = async () => {
    if (!canUpdate || !actionTask || busy.current) return;
    busy.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await updateMyTask(
        actionTask.id,
        actionTask.status === 'PENDING' ? 'start' : 'complete',
      );
      setSuccess(response);
      setActionTask(null);
      refresh();
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between mb-3">
        <h2>Công việc của tôi</h2>
        <Button variant="outline-primary" onClick={refresh} disabled={result.loading || saving}>
          Tải lại
        </Button>
      </div>
      <Alert variant="info">
        Công việc lấy từ SQL Server theo nhân viên local cấu hình tại backend, chưa phải phiên đăng
        nhập JWT. Hoàn thành task không tự đổi trạng thái phòng hoặc sự cố liên quan.
      </Alert>
      {result.context && (
        <Alert variant={result.context.enabled ? 'info' : 'warning'}>
          {result.context.enabled ? (
            <>
              Nhân viên local: <strong>{result.context.staffName}</strong>. Danh sách chỉ gồm công
              việc được giao cho nhân viên này.
            </>
          ) : (
            result.context.message
          )}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          Đã cập nhật công việc #{success.id}: {statuses[success.status][0]}. Bộ lọc hiện tại vẫn
          được giữ.
        </Alert>
      )}
      {result.error && (
        <Alert variant="danger">
          {result.error}{' '}
          <Button size="sm" variant="outline-danger" onClick={refresh}>
            Thử lại
          </Button>
        </Alert>
      )}
      <Form
        className="bg-light p-3 border rounded mb-3"
        onSubmit={(event) => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <Row className="g-2 align-items-end">
          <Col md={3}>
            <Form.Group controlId="my-task-room">
              <Form.Label>Phòng</Form.Label>
              <Form.Control
                name="room"
                value={draft.room}
                onChange={handleChange}
                placeholder="VD: 103"
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="my-task-status">
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select name="status" value={draft.status} onChange={handleChange}>
                <option value="">Tất cả</option>
                {Object.entries(statuses).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[0]}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="my-task-type">
              <Form.Label>Loại công việc</Form.Label>
              <Form.Select name="type" value={draft.type} onChange={handleChange}>
                <option value="">Tất cả</option>
                {Object.entries(types).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex gap-2">
            <Button type="submit" disabled={result.loading || saving}>
              Tìm kiếm
            </Button>
            <Button
              variant="outline-secondary"
              disabled={result.loading || saving}
              onClick={() => {
                setDraft(defaults);
                apply(defaults);
              }}
            >
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Form>
      <Table striped bordered hover responsive className="align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>Phòng</th>
            <th>Công việc</th>
            <th>Loại</th>
            <th>Ưu tiên</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {result.loading ? (
            <tr>
              <td colSpan={7} role="status">
                Đang tải công việc...
              </td>
            </tr>
          ) : result.error ? (
            <tr>
              <td colSpan={7}>Chưa tải được dữ liệu.</td>
            </tr>
          ) : !result.context?.enabled ? (
            <tr>
              <td colSpan={7}>Cần cấu hình nhân viên local trước khi xem công việc.</td>
            </tr>
          ) : !result.items.length ? (
            <tr>
              <td colSpan={7}>Không có công việc trong trang này hoặc phù hợp bộ lọc.</td>
            </tr>
          ) : (
            result.items.map((task, index) => (
              <tr key={task.id}>
                <td>{page * size + index + 1}</td>
                <td>{task.roomNumber}</td>
                <td>{task.title}</td>
                <td>{types[task.taskType]}</td>
                <td>{priorities[task.priority]}</td>
                <td>
                  <Badge
                    bg={statuses[task.status][1]}
                    text={task.status === 'IN_PROGRESS' ? 'dark' : 'white'}
                  >
                    {statuses[task.status][0]}
                  </Badge>
                </td>
                <td>
                  <Button size="sm" variant="outline-primary" onClick={() => setDetail(task)}>
                    Chi tiết
                  </Button>
                  {canUpdate && ['PENDING', 'IN_PROGRESS'].includes(task.status) && (
                    <Button size="sm" className="ms-2" onClick={() => chooseAction(task)}>
                      {task.status === 'PENDING' ? 'Bắt đầu' : 'Hoàn thành'}
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <div className="d-flex justify-content-between">
        <span>Trang {page + 1}</span>
        <Pagination>
          <Pagination.Prev
            disabled={page === 0 || result.loading || saving}
            onClick={() => changePage(page - 1)}
          />
          <Pagination.Next
            disabled={result.loading || saving || !!result.error || result.items.length < size}
            onClick={() => changePage(page + 1)}
          />
        </Pagination>
      </div>
      <Modal show={!!detail} onHide={() => setDetail(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Công việc #{detail?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detail && (
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>Tiêu đề:</strong> {detail.title}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Phòng:</strong> {detail.roomNumber}
              </ListGroup.Item>
              <ListGroup.Item className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                <strong>Mô tả:</strong> {detail.description || 'Chưa có'}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Lịch thực hiện:</strong> {formatDate(detail.scheduledAt)}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Bắt đầu:</strong> {formatDate(detail.startedAt)}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Hoàn thành:</strong> {formatDate(detail.completedAt)}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Sự cố liên quan:</strong>{' '}
                {detail.issueId ? `#${detail.issueId}` : 'Không có'}
              </ListGroup.Item>
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={!!actionTask}
        onHide={() => {
          if (!saving) setActionTask(null);
        }}
        backdrop={saving ? 'static' : true}
        keyboard={!saving}
        centered
      >
        <Modal.Header closeButton={!saving}>
          <Modal.Title>
            {actionTask?.status === 'PENDING' ? 'Bắt đầu' : 'Hoàn thành'} công việc #
            {actionTask?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-break">{actionTask?.title}</p>
          <p>Nhân viên local: {result.context?.staffName}. Thời gian sẽ được lưu tại SQL Server.</p>
          {saveError && <Alert variant="danger">{saveError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={saving} onClick={() => setActionTask(null)}>
            Hủy
          </Button>
          <Button disabled={saving} onClick={perform}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
