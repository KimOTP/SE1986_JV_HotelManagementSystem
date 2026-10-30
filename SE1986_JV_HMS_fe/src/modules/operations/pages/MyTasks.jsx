import { useState, useMemo } from 'react';
import { Table, Badge, Form, Row, Col, Pagination, Button } from 'react-bootstrap';
import { mockTasks as initialTasks } from '../mocks/mockData';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

const MyTasks = () => {
  const { user, hasPermission } = useAuth();
  const canUpdateTask = hasPermission('UC-E2');
  const currentUser = user?.name || user?.fullName;

  // 1. QUẢN LÝ STATE DỮ LIỆU
  const [tasks, setTasks] = useState(initialTasks);

  // 2. STATE CHO FORM NHẬP LIỆU
  const [formData, setFormData] = useState({
    room: '',
    status: 'ALL',
    type: 'ALL',
  });

  // 3. STATE CHO ĐIỀU KIỆN LỌC
  const [searchParams, setSearchParams] = useState({
    room: '',
    status: 'ALL',
    type: 'ALL',
  });

  // 4. STATE CHO PAGING
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Hàm cập nhật form khi gõ/chọn
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Hàm xử lý khi bấm nút TÌM KIẾM
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(formData);
    setCurrentPage(1);
  };

  // Hàm xử lý khi bấm nút RESET
  const handleReset = () => {
    const emptyForm = { room: '', status: 'ALL', type: 'ALL' };
    setFormData(emptyForm);
    setSearchParams(emptyForm);
    setCurrentPage(1);
  };

  // 5. HÀM XỬ LÝ CẬP NHẬT TRẠNG THÁI (Dùng chung cho Dropdown)
  const handleUpdateStatus = (taskId, newStatus) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  // 6. LỌC DỮ LIỆU
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => t.assignedTo === currentUser);

    if (searchParams.status !== 'ALL')
      result = result.filter((t) => t.status === searchParams.status);
    if (searchParams.type !== 'ALL')
      result = result.filter((t) => t.type === searchParams.type);
    if (searchParams.room.trim() !== '')
      result = result.filter((t) => t.roomNumber.includes(searchParams.room.trim()));

    return result;
  }, [currentUser, searchParams, tasks]);

  // 7. PHÂN TRANG
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div>
      <h2 className="mb-4">Công việc của tôi</h2>

      {/* KHU VỰC FILTER */}
      <Form onSubmit={handleSearch} className="mb-3 g-2 bg-light p-3 rounded border">
        <Row className="align-items-end">
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Tìm theo phòng</Form.Label>
              <Form.Control
                type="text"
                name="room"
                placeholder="VD: 101..."
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
                <option value="TODO">Chờ xử lý</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="DONE">Đã hoàn thành</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Loại công việc</Form.Label>
              <Form.Select name="type" value={formData.type} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="Daily Clean">Dọn hàng ngày</option>
                <option value="Deep Clean">Dọn tổng thể</option>
                <option value="Maintenance">Bảo trì</option>
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
      <Table striped bordered hover className="align-middle">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Phòng</th>
            <th>Loại công việc</th>
            <th>Độ ưu tiên</th>
            <th>Trạng thái hiện tại</th>
            <th>Cập nhật trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {currentTasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-muted">
                Không tìm thấy công việc nào phù hợp với bộ lọc.
              </td>
            </tr>
          ) : (
            currentTasks.map((t, index) => (
              <tr key={t.id}>
                <td>{indexOfFirstItem + index + 1}</td>
                <td className="fw-semibold">{t.roomNumber}</td>
                <td>{t.type}</td>
                <td>
                  <Badge
                    bg={
                      t.priority === 'High'
                        ? 'danger'
                        : t.priority === 'Medium'
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {t.priority === 'High' ? 'Cao' : t.priority === 'Medium' ? 'Trung bình' : 'Thấp'}
                  </Badge>
                </td>
                <td>
                  <Badge
                    bg={
                      t.status === 'DONE'
                        ? 'success'
                        : t.status === 'IN_PROGRESS'
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {t.status === 'DONE' ? 'Đã hoàn thành' : t.status === 'IN_PROGRESS' ? 'Đang thực hiện' : 'Chờ xử lý'}
                  </Badge>
                </td>
                <td>
                  {/* DROPDOWN ĐỂ CẬP NHẬT TRẠNG THÁI */}
                  <Form.Select
                    size="sm"
                    value={t.status}
                    disabled={!canUpdateTask}
                    onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                    style={{ width: '160px' }}
                  >
                    <option value="TODO">Chờ xử lý</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="DONE">Đã hoàn thành</option>
                  </Form.Select>
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
            Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTasks.length)} /{' '}
            {filteredTasks.length} công việc
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
    </div>
  );
};

export default MyTasks;
