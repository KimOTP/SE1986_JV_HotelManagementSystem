import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Pagination, Row } from 'react-bootstrap';
import { getAssignmentContext } from '../api/issueAssignmentsApi';
import { getManagedTasks } from '../api/taskManagementApi';
import CreateTaskModal from '../components/CreateTaskModal';
import OperationsPageHeader from '../components/OperationsPageHeader';
import {
  TASK_STATUSES as columns,
  getTaskStatus,
  getPriority,
} from '../constants/operationsLabels';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { ROLES } from '../../auths/constants/authConstants';

const types = { CLEANING: 'Dọn phòng', MAINTENANCE: 'Bảo trì' };
const empty = { room: '', status: '', type: '' };
const size = 12;
const formatDate = (value) =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN');

export default function HousekeepingTaskBoard() {
  const { hasPermission, hasRole } = useAuth();
  const canManage = (hasRole(ROLES.ADMIN) || hasRole(ROLES.MANAGER)) && hasPermission('UC-E1');
  const [draft, setDraft] = useState(empty);
  const [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ loading: true, items: [], context: null, error: null });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const context = await getAssignmentContext(controller.signal);
        const items = context.enabled
          ? await getManagedTasks({ ...filters, page, size }, controller.signal)
          : [];
        if (!controller.signal.aborted) setResult({ loading: false, items, context, error: null });
      } catch {
        if (!controller.signal.aborted)
          setResult({
            loading: false,
            items: [],
            context: null,
            error:
              'Không tải được bảng công việc. Kiểm tra backend và quyền của quản lý đang đăng nhập rồi thử lại.',
          });
      }
    };
    load();
    return () => controller.abort();
  }, [canManage, filters, page, attempt]);
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
    setDraft((value) => ({ ...value, [event.target.name]: event.target.value }));
  if (!canManage)
    return (
      <Alert variant="warning">
        Bảng giao việc dành cho tài khoản có quyền quản lý housekeeping và UC-E1. Nhân viên xem phần
        Công việc của tôi.
      </Alert>
    );

  return (
    <div>
      <OperationsPageHeader
        title="Bảng công việc"
        description="Giao công việc cho nhân viên và theo dõi tiến độ. Số đếm trên mỗi cột chỉ tính các công việc trong trang hiện tại."
      >
        <Button variant="outline-primary" disabled={result.loading} onClick={refresh}>
          Tải lại
        </Button>
        <Button
          disabled={result.loading || !result.context?.enabled}
          onClick={() => {
            setCreated(null);
            setCreating(true);
          }}
        >
          + Tạo và giao việc
        </Button>
      </OperationsPageHeader>
      {result.context && (
        <Alert variant={result.context.enabled ? 'info' : 'warning'}>
          {result.context.enabled ? (
            <>
              Người giao việc: <strong>{result.context.managerName}</strong>.
              <Badge bg="secondary">Phiên đăng nhập hiện tại</Badge>
            </>
          ) : (
            result.context.message
          )}
        </Alert>
      )}
      {created && (
        <Alert variant="success" dismissible onClose={() => setCreated(null)}>
          Đã tạo và giao công việc #{created.id}, trạng thái Chờ xử lý. Bộ lọc đã được đặt lại để
          xem công việc mới.
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
      <Form
        className="operations-filter-panel"
        onSubmit={(event) => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <Row className="g-2 align-items-end">
          <Col md={3}>
            <Form.Group controlId="task-board-room">
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
            <Form.Group controlId="task-board-status">
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select name="status" value={draft.status} onChange={handleChange}>
                <option value="">Tất cả</option>
                {Object.entries(columns).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="task-board-type">
              <Form.Label>Loại việc</Form.Label>
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
            <Button type="submit" disabled={result.loading}>
              Tìm kiếm
            </Button>
            <Button
              variant="outline-secondary"
              disabled={result.loading}
              onClick={() => {
                setDraft(empty);
                apply(empty);
              }}
            >
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Form>
      {result.loading ? (
        <Alert variant="info" role="status">
          Đang tải công việc...
        </Alert>
      ) : (
        !result.error &&
        result.context?.enabled && (
          <>
            {!result.items.length && (
              <Alert variant="secondary">
                Không có công việc trong trang này hoặc phù hợp bộ lọc.
              </Alert>
            )}
            <Row className="g-3">
              {Object.entries(columns).map(([status, { label, color, text }]) => {
                const items = result.items.filter((task) => task.status === status);
                return (
                  <Col md={6} xl={3} key={status}>
                    <div className="bg-light border rounded p-3 h-100">
                      <h5>
                        {label}{' '}
                        <Badge bg={color} text={text}>
                          {items.length}
                        </Badge>
                      </h5>
                      {items.map((task) => (
                        <Card className="mb-3" key={task.id}>
                          <Card.Body>
                            <Card.Title className="text-break">{task.title}</Card.Title>
                            <Card.Text>
                              {task.hotelName} — Phòng {task.roomNumber}
                              <br />
                              {types[task.taskType]} · {getPriority(task.priority).label}
                              <br />
                              Nhân viên: {task.assignedTo}
                              <br />
                              Lịch: {formatDate(task.scheduledAt)}
                            </Card.Text>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => setDetail(task)}
                            >
                              Chi tiết
                            </Button>
                          </Card.Body>
                        </Card>
                      ))}
                      {!items.length && (
                        <p className="text-muted small">Không có trong trang này.</p>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>
          </>
        )
      )}
      <div className="d-flex justify-content-between mt-3">
        <span>Trang {page + 1}</span>
        <Pagination>
          <Pagination.Prev
            disabled={page === 0 || result.loading}
            onClick={() => changePage(page - 1)}
          />
          <Pagination.Next
            disabled={result.loading || !!result.error || result.items.length < size}
            onClick={() => changePage(page + 1)}
          />
        </Pagination>
      </div>
      {creating && (
        <CreateTaskModal
          managerName={result.context?.managerName}
          onClose={() => setCreating(false)}
          onCreated={(response) => {
            setCreating(false);
            setCreated(response);
            setDraft(empty);
            apply(empty);
          }}
        />
      )}
      <Modal show={!!detail} onHide={() => setDetail(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Công việc #{detail?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detail && (
            <>
              <h5 className="text-break">{detail.title}</h5>
              <p>
                {detail.hotelName} — Phòng {detail.roomNumber}
              </p>
              <p className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                {detail.description || 'Chưa có mô tả'}
              </p>
              <p>
                Loại: {types[detail.taskType]} · Ưu tiên: {getPriority(detail.priority).label}
              </p>
              <p>
                Nhân viên: {detail.assignedTo}
                <br />
                Người giao việc: {detail.assignedBy}
              </p>
              <p>
                Lịch: {formatDate(detail.scheduledAt)}
                <br />
                Trạng thái: {getTaskStatus(detail.status).label}
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
