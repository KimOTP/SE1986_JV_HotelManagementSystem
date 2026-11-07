import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  ListGroup,
  ProgressBar,
  Row,
  Table,
} from 'react-bootstrap';
import { Link } from 'react-router';
import { getAssignmentContext } from '../api/issueAssignmentsApi';
import { getHousekeepingDashboard } from '../api/dashboardApi';
import OperationsPageHeader from '../components/OperationsPageHeader';
import IssueStatusBadge from '../components/IssueStatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { TASK_STATUSES } from '../constants/operationsLabels';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { ROLES } from '../../auths/constants/authConstants';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export default function HousekeepingDashboard() {
  const { hasPermission, hasRole } = useAuth();
  const allowed = (hasRole(ROLES.ADMIN) || hasRole(ROLES.MANAGER)) && hasPermission('UC-E3');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';
  const [date, setDate] = useState(today);
  const [allTime, setAllTime] = useState(true);
  const [auto, setAuto] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, context: null, error: null, loading: true });
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let timer;
    const load = async () => {
      try {
        const context = await getAssignmentContext(controller.signal);
        const data = context.enabled
          ? await getHousekeepingDashboard(date, zone, controller.signal, allTime)
          : null;
        if (!controller.signal.aborted) setState({ data, context, error: null, loading: false });
      } catch {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            error: 'Không tải được dashboard. Dữ liệu cũ (nếu có) chưa được cập nhật.',
            loading: false,
          }));
      } finally {
        if (auto && !controller.signal.aborted) timer = setTimeout(load, 30000);
      }
    };
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [allowed, date, zone, auto, attempt, allTime]);
  const refresh = () => {
    setState((previous) => ({ ...previous, loading: true }));
    setAttempt((value) => value + 1);
  };
  if (!allowed)
    return (
      <Alert variant="warning">
        Dashboard dành cho Manager/Admin có quyền UC-E3. Nhân viên xem Công việc của tôi.
      </Alert>
    );
  const data = state.data;
  const stats = data
    ? [
        ['Tổng công việc', data.summary.total],
        [TASK_STATUSES.PENDING.label, data.summary.pending],
        [TASK_STATUSES.IN_PROGRESS.label, data.summary.inProgress],
        [TASK_STATUSES.COMPLETED.label, data.summary.completed],
        [TASK_STATUSES.CANCELLED.label, data.summary.cancelled],
        ['Quá hạn', data.summary.overdue],
      ]
    : [];
  const effective = data ? data.summary.total - data.summary.cancelled : 0;
  const rate = effective ? Math.round((data.summary.completed / effective) * 100) : 0;
  return (
    <div>
      <OperationsPageHeader
        title="Tổng quan vận hành"
        description="Theo dõi công việc, tiến độ và khối lượng của nhân viên trong khách sạn."
      />
      <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
        <Form.Group controlId="dashboard-scope">
          <Form.Label>Phạm vi thống kê</Form.Label>
          <Form.Select
            value={allTime ? 'all' : 'day'}
            onChange={(event) => {
              setState({ data: null, context: null, error: null, loading: true });
              setAllTime(event.target.value === 'all');
            }}
          >
            <option value="all">Tất cả thời gian</option>
            <option value="day">Theo ngày</option>
          </Form.Select>
        </Form.Group>
        <Form.Group controlId="dashboard-date">
          <Form.Label>Ngày ({zone})</Form.Label>
          <Form.Control
            type="date"
            value={date}
            disabled={allTime}
            min="0002-01-01"
            max="9998-12-31"
            onChange={(event) => {
              if (event.target.value) {
                setState({ data: null, context: null, error: null, loading: true });
                setDate(event.target.value);
              }
            }}
          />
        </Form.Group>
        <Form.Check
          id="dashboard-auto"
          label="Tự cập nhật mỗi 30 giây"
          checked={auto}
          onChange={(event) => setAuto(event.target.checked)}
        />
        <Button disabled={state.loading} onClick={refresh}>
          Tải lại
        </Button>
      </div>
      {state.context && (
        <Alert variant={state.context.enabled ? 'info' : 'warning'}>
          {state.context.enabled ? (
            <>
              Người quản lý: <strong>{state.context.managerName}</strong>{' '}
              <Badge bg="secondary">Phiên đăng nhập hiện tại</Badge>
            </>
          ) : (
            state.context.message
          )}
        </Alert>
      )}
      {state.loading && <p role="status">Đang cập nhật...</p>}
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {data && (
        <>
          <small className="text-muted">
            Phạm vi: {data.allTime ? 'Tất cả thời gian' : data.date} · Cập nhật:{' '}
            {new Date(data.generatedAt).toLocaleString('vi-VN')}
          </small>
          <Row className="g-3 my-2">
            {stats.map(([label, value]) => (
              <Col xs={6} md={4} xl={2} key={label}>
                <Card>
                  <Card.Body>
                    <div>{label}</div>
                    <h3>{value}</h3>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Card className="my-3">
            <Card.Body>
              <h5>Tiến độ: {rate}%</h5>
              <ProgressBar now={rate} label={`${rate}%`} />
              <small>
                Hoàn thành {data.summary.completed}/{effective} công việc không bị hủy (
                {data.allTime ? 'tất cả thời gian' : 'ngày đã chọn'}).
              </small>
            </Card.Body>
          </Card>
          <h4>Khối lượng công việc theo nhân viên</h4>
          <Table responsive bordered striped>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Khách sạn</th>
                <th>Chờ</th>
                <th>Đang làm</th>
                <th>Hoàn thành</th>
                <th>Hủy</th>
              </tr>
            </thead>
            <tbody>
              {data.workload.length ? (
                data.workload.map((staff) => (
                  <tr key={staff.staffId}>
                    <td>
                      {staff.employeeCode} — {staff.fullName}{' '}
                      {!staff.active && <Badge bg="secondary">Ngừng hoạt động</Badge>}
                    </td>
                    <td>{staff.hotelName}</td>
                    <td>{staff.pending}</td>
                    <td>{staff.inProgress}</td>
                    <td>{staff.completed}</td>
                    <td>{staff.cancelled}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>Chưa có nhân viên hoặc công việc.</td>
                </tr>
              )}
            </tbody>
          </Table>
          <Row className="g-3">
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h5>Ưu tiên cao chưa xong ({data.summary.highPriorityOpen})</h5>
                  <small>Hiển thị tối đa 5 công việc trong phạm vi thống kê.</small>
                  <ListGroup variant="flush">
                    {data.urgentTasks.map((task) => (
                      <ListGroup.Item key={task.id} className="text-break">
                        Phòng {task.roomNumber}: {task.title}
                        <br />
                        <small>
                          {task.assignedTo} · <PriorityBadge priority={task.priority} />
                        </small>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  {!data.urgentTasks.length && <p>Không có công việc ưu tiên cao đang chờ.</p>}
                  <Button as={Link} to="/operations/tasks" variant="link">
                    Bảng công việc
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h5>Sự cố chưa hoàn tất</h5>
                  <small>Hiển thị tối đa 5 sự cố.</small>
                  <ListGroup variant="flush">
                    {data.openIssues.map((issue) => (
                      <ListGroup.Item key={issue.id} className="text-break">
                        Phòng {issue.roomNumber}: {issue.title}
                        <br />
                        <IssueStatusBadge status={issue.status} />
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  {!data.openIssues.length && (
                    <p>Không có sự cố đang chờ trong phạm vi thống kê.</p>
                  )}
                  <Button as={Link} to="/operations/issues" variant="link">
                    Quản lý sự cố
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
