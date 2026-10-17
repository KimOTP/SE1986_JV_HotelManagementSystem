import { Container, Row, Col, Card, Badge, Button, ListGroup, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router';
import { mockTasks, mockIssues } from '../mocks/mockData';

const HousekeepingDashboard = () => {
  // 1. TÍNH TOÁN SỐ LIỆU
  const totalTasks = mockTasks.length;
  const todoTasks = mockTasks.filter((t) => t.status === 'TODO').length;
  const inProgressTasks = mockTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneTasks = mockTasks.filter((t) => t.status === 'DONE').length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // 2. LẤY DỮ LIỆU CHO CÁC BẢNG BÊN DƯỚI
  // Lấy 4 task ưu tiên cao nhất chưa làm xong
  const urgentTasks = mockTasks
    .filter((t) => t.status !== 'DONE' && t.priority === 'High')
    .slice(0, 4);

  // Lấy 4 sự cố mới nhất chưa xử lý
  const recentIssues = mockIssues.filter((i) => i.status !== 'RESOLVED').slice(0, 4);

  const stats = [
    { label: 'Tổng Tasks', value: totalTasks, color: 'primary' },
    { label: 'Chờ xử lý (To Do)', value: todoTasks, color: 'secondary' },
    { label: 'Đang thực hiện', value: inProgressTasks, color: 'warning' },
    { label: 'Đã hoàn thành', value: doneTasks, color: 'success' },
  ];

  return (
    <Container fluid className="p-0">
      {/* LỜI CHÀO */}
      <div className="mb-4">
        <h2 className="fw-bold">Tổng quan Vận hành</h2>
        <p className="text-muted">Chào buổi sáng, đây là tình hình hoạt động dọn phòng hôm nay.</p>
      </div>

      {/* HÀNG 1: CÁC THẺ SỐ LIỆU */}
      <Row className="mb-4">
        {stats.map((s) => (
          <Col md={3} key={s.label}>
            <Card className={`border-0 shadow-sm border-start border-4 border-${s.color}`}>
              <Card.Body>
                <div className="text-muted small fw-semibold mb-1">{s.label}</div>
                <h2 className={`mb-0 text-${s.color} fw-bold`}>{s.value}</h2>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* HÀNG 2: CHI TIẾT CÔNG VIỆC VÀ SỰ CỐ */}
      <Row className="g-4">
        {/* CỘT TRÁI: TASK KHẨN CẤP */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">Công việc ưu tiên cao</h5>
              <Button
                as={Link}
                to="/operations/tasks"
                variant="link"
                className="text-decoration-none p-0"
              >
                Xem Task Board
              </Button>
            </Card.Header>
            <Card.Body className="px-4 pb-4">
              {urgentTasks.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  Tuyệt vời! Không có công việc khẩn cấp nào.
                </div>
              ) : (
                <ListGroup variant="flush">
                  {urgentTasks.map((task) => (
                    <ListGroup.Item
                      key={task.id}
                      className="px-0 py-3 border-bottom d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-1 fw-bold">
                          Phòng {task.roomNumber} - {task.type}
                        </h6>
                        <small className="text-muted">
                          Người thực hiện: {task.assignedTo || 'Chưa phân công'}
                        </small>
                      </div>
                      <div className="text-end">
                        <Badge bg="danger" className="mb-2">
                          High
                        </Badge>
                        <br />
                        <small className="text-secondary">{task.status}</small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* CỘT PHẢI: SỰ CỐ MỚI & TIẾN ĐỘ */}
        <Col lg={5}>
          {/* Sự cố mới */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">Sự cố đang chờ</h5>
              <Button
                as={Link}
                to="/operations/issues"
                variant="link"
                className="text-decoration-none p-0"
              >
                Xem tất cả
              </Button>
            </Card.Header>
            <Card.Body className="px-4 pb-4">
              <ListGroup variant="flush">
                {recentIssues.map((issue) => (
                  <ListGroup.Item
                    key={issue.id}
                    className="px-0 py-2 border-bottom d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <span className="fw-semibold text-danger me-2">Phòng {issue.roomNumber}</span>
                      <small className="text-muted">{issue.category}</small>
                    </div>
                    <Badge bg="warning" text="dark">
                      {issue.status}
                    </Badge>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>

          {/* Tiến độ ngày hôm nay */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Tiến độ công việc hôm nay</h5>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Đã hoàn thành</span>
                <span className="fw-bold text-success small">{completionRate}%</span>
              </div>
              <ProgressBar
                now={completionRate}
                variant="success"
                className="mb-3"
                style={{ height: '10px' }}
              />
              <p className="text-muted small mb-0">
                Đã hoàn thành {doneTasks} trên tổng số {totalTasks} công việc được giao.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HousekeepingDashboard;
