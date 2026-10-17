import { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { mockTasks } from '../mocks/mockData';

const HousekeepingTaskBoard = () => {
  const columns = [
    { key: 'TODO', title: 'To Do', bg: 'secondary' },
    { key: 'IN_PROGRESS', title: 'In Progress', bg: 'warning' },
    { key: 'DONE', title: 'Done', bg: 'success' },
  ];

  const INITIAL_LIMIT = 3;
  const LOAD_STEP = 3;

  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);

  // Hàm Xem thêm
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + LOAD_STEP);
  };

  // Hàm Thu gọn (đưa về số lượng ban đầu)
  const handleShowLess = () => {
    setVisibleCount(INITIAL_LIMIT);
  };

  // Kiểm tra xem có cột nào còn dữ liệu chưa hiện không
  const hasMoreData = columns.some((col) => {
    const totalTasksInCol = mockTasks.filter((t) => t.status === col.key).length;
    return totalTasksInCol > visibleCount;
  });

  // Kiểm tra xem người dùng đã bấm Xem thêm chưa (để hiện nút Thu gọn)
  const isExpanded = visibleCount > INITIAL_LIMIT;

  return (
    <Container fluid className="p-4">
      <div className="text-center mb-4">
        <h5 className="text-primary fw-bold mb-0">Ban công tác dọn phòng</h5>
        <h2 className="mb-0">Housekeeping Task Board</h2>
      </div>

      <Row>
        {columns.map((col) => {
          const columnTasks = mockTasks.filter((t) => t.status === col.key);
          const visibleTasks = columnTasks.slice(0, visibleCount);

          return (
            <Col md={4} key={col.key} className="mb-4">
              <div className={`bg-${col.bg} bg-opacity-10 p-3 rounded h-100`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 fw-bold text-dark">{col.title}</h5>
                  <Badge bg="dark" pill>
                    {columnTasks.length}
                  </Badge>
                </div>

                {visibleTasks.map((task) => (
                  <Card key={task.id} className="mb-3 shadow-sm border-0">
                    <Card.Body>
                      <div className="d-flex justify-content-between">
                        <Card.Title className="fw-bold">Phòng {task.roomNumber}</Card.Title>
                        <Badge
                          bg={
                            task.priority === 'High'
                              ? 'danger'
                              : task.priority === 'Medium'
                                ? 'warning'
                                : 'secondary'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <Card.Text className="small text-muted mb-1">{task.type}</Card.Text>
                      {task.assignedTo && (
                        <small className="text-secondary">NV: {task.assignedTo}</small>
                      )}
                    </Card.Body>
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center text-muted py-4 bg-white rounded border">
                    Chưa có công việc
                  </div>
                )}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* KHU VỰC NÚT BẤM ĐIỀU KHIỂN */}
      <div className="text-center mt-3 mb-5 d-flex justify-content-center gap-3">
        {/* Nút Xem thêm (Chỉ hiện khi còn dữ liệu) */}
        {hasMoreData && (
          <Button
            variant="primary"
            className="px-5 py-2 rounded-pill shadow-sm"
            onClick={handleLoadMore}
          >
            Xem thêm công việc
          </Button>
        )}

        {/* Nút Thu gọn (Chỉ hiện khi đã bấm Xem thêm ít nhất 1 lần) */}
        {isExpanded && (
          <Button
            variant="outline-secondary"
            className="px-5 py-2 rounded-pill shadow-sm"
            onClick={handleShowLess}
          >
            Thu gọn
          </Button>
        )}
      </div>
    </Container>
  );
};

export default HousekeepingTaskBoard;
