import { useState, useMemo } from 'react';
import { Table, Badge, Button, Form, Row, Col, Pagination } from 'react-bootstrap';
import { mockTasks } from '../mocks/mockData';

const MyTasks = () => {
  const currentUser = 'Nguyễn Văn A';

  // 1. STATE CHO FORM NHẬP LIỆU
  const [formData, setFormData] = useState({
    room: '',
    status: 'ALL',
    type: 'ALL',
  });

  // 2. STATE CHO ĐIỀU KIỆN LỌC
  const [searchParams, setSearchParams] = useState({
    room: '',
    status: 'ALL',
    type: 'ALL',
  });

  // 3. STATE CHO PAGING
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Hàm cập nhật form khi gõ/chọn
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Hàm xử lý khi bấm nút TÌM KIẾM
  const handleSearch = (e) => {
    e.preventDefault(); // Ngăn form load lại trang
    setSearchParams(formData); // Chép dữ liệu từ form sang searchParams
    setCurrentPage(1);
  };

  // Hàm xử lý khi bấm nút RESET
  const handleReset = () => {
    const emptyForm = { room: '', status: 'ALL', type: 'ALL' };
    setFormData(emptyForm);
    setSearchParams(emptyForm);
    setCurrentPage(1);
  };

  // 4. LỌC DỮ LIỆU (Dựa trên searchParams)
  const filteredTasks = useMemo(() => {
    let result = mockTasks.filter((t) => t.assignedTo === currentUser);

    if (searchParams.status !== 'ALL')
      result = result.filter((t) => t.status === searchParams.status);
    if (searchParams.type !== 'ALL') result = result.filter((t) => t.type === searchParams.type);
    if (searchParams.room.trim() !== '')
      result = result.filter((t) => t.roomNumber.includes(searchParams.room.trim()));

    return result;
  }, [searchParams]);

  // 5. PHÂN TRANG
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div>
      <h2 className="mb-4">My Tasks</h2>

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
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1 fw-semibold">Loại công việc</Form.Label>
              <Form.Select name="type" value={formData.type} onChange={handleFormChange}>
                <option value="ALL">Tất cả</option>
                <option value="Daily Clean">Daily Clean</option>
                <option value="Deep Clean">Deep Clean</option>
                <option value="Maintenance">Maintenance</option>
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
            <th>Room</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {currentTasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-muted">
                Không tìm thấy task nào phù hợp với bộ lọc.
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
                    {t.priority}
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
                    {t.status}
                  </Badge>
                </td>
                <td>
                  {t.status !== 'DONE' && (
                    <Button size="sm" variant="success">
                      Mark as Done
                    </Button>
                  )}
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
            {filteredTasks.length} tasks
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
