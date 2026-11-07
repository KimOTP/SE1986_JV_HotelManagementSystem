import { useEffect, useRef, useState } from 'react';
import { PRIORITIES } from '../constants/operationsLabels';
import { Alert, Button, Form, Modal, Row, Col } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, toTaskPayload } from '../schemas/createTaskSchema';
import { createManagedTask, getTaskAssignees, getTaskRooms } from '../api/taskManagementApi';

export default function CreateTaskModal({ managerName, onClose, onCreated }) {
  const [rooms, setRooms] = useState({ items: [], loading: true, error: null });
  const [assignees, setAssignees] = useState({ items: [], loading: false, error: null });
  const [roomId, setRoomId] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(null);
  const busy = useRef(false);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      roomId: '',
      staffId: '',
      taskType: 'CLEANING',
      title: '',
      description: '',
      priority: 'NORMAL',
      scheduledAt: '',
    },
  });
  useEffect(() => {
    const controller = new AbortController();
    getTaskRooms(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setRooms({ items, loading: false, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setRooms({
            items: [],
            loading: false,
            error:
              'Không tải được phòng thuộc phạm vi manager. Hãy kiểm tra cấu hình backend và tải lại.',
          });
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!roomId) return;
    const controller = new AbortController();
    getTaskAssignees(Number(roomId), controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setAssignees({ items, loading: false, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setAssignees({
            items: [],
            loading: false,
            error: 'Không tải được nhân viên cho phòng đã chọn. Thử chọn lại phòng hoặc tải lại.',
          });
      });
    return () => controller.abort();
  }, [roomId, attempt]);
  const retry = () => {
    setSaveError(null);
    setRooms({ items: [], loading: true, error: null });
    setAssignees({ items: [], loading: !!roomId, error: null });
    setValue('staffId', '');
    setAttempt((value) => value + 1);
  };
  const submit = async (values) => {
    if (busy.current) return;
    setSaveError(null);
    if (
      !rooms.items.some((room) => room.id === values.roomId) ||
      !assignees.items.some((staff) => staff.id === values.staffId)
    ) {
      setSaveError('Phòng hoặc nhân viên không hợp lệ. Vui lòng tải lại danh sách.');
      return;
    }
    busy.current = true;
    try {
      const response = await createManagedTask(toTaskPayload(values));
      onCreated(response);
    } catch (error) {
      const status = error.response?.status;
      setSaveError(
        status === 400
          ? 'Dữ liệu không hợp lệ, phòng hoặc nhân viên không còn hoạt động. Vui lòng tải lại.'
          : status === 403
            ? 'Manager không có quyền giao việc cho khách sạn này.'
            : status === 503
              ? 'Chưa quyền của quản lý đang đăng nhập hợp lệ.'
              : 'Chưa xác nhận được kết quả lưu. Kiểm tra bảng trước khi gửi lại để tránh tạo trùng.',
      );
    } finally {
      busy.current = false;
    }
  };
  const blocked =
    rooms.loading ||
    !!rooms.error ||
    !rooms.items.length ||
    assignees.loading ||
    !!assignees.error ||
    !assignees.items.length;
  return (
    <Modal
      show
      size="lg"
      centered
      backdrop={isSubmitting ? 'static' : true}
      keyboard={!isSubmitting}
      onHide={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title>Tạo và giao công việc</Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={(event) => handleSubmit(submit)(event)}>
        <Modal.Body>
          <Alert variant="info">
            Người giao việc: <strong>{managerName}</strong>. Phiên đăng nhập hiện tại. Nhập lịch
            theo giờ địa phương.
          </Alert>
          {rooms.loading && (
            <Alert variant="info" role="status">
              Đang tải phòng...
            </Alert>
          )}
          {rooms.error && <Alert variant="danger">{rooms.error}</Alert>}
          {!rooms.loading && !rooms.error && !rooms.items.length && (
            <Alert variant="warning">Không có phòng hoạt động thuộc phạm vi manager này.</Alert>
          )}
          {assignees.loading && (
            <Alert variant="info" role="status">
              Đang tải nhân viên...
            </Alert>
          )}
          {assignees.error && <Alert variant="danger">{assignees.error}</Alert>}
          {roomId && !assignees.loading && !assignees.error && !assignees.items.length && (
            <Alert variant="warning">Khách sạn này chưa có nhân viên STAFF hoạt động.</Alert>
          )}
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <fieldset disabled={isSubmitting}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="task-create-room">
                  <Form.Label>Phòng</Form.Label>
                  <Form.Select
                    {...register('roomId', {
                      onChange: (event) => {
                        setValue('staffId', '');
                        setAssignees({ items: [], loading: !!event.target.value, error: null });
                        setRoomId(event.target.value);
                      },
                    })}
                    isInvalid={!!errors.roomId}
                    disabled={rooms.loading || !!rooms.error}
                  >
                    <option value="">-- Chọn phòng --</option>
                    {rooms.items.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.hotelName} — Phòng {room.roomNumber}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.roomId?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="task-create-staff">
                  <Form.Label>Nhân viên</Form.Label>
                  <Form.Select
                    {...register('staffId')}
                    isInvalid={!!errors.staffId}
                    disabled={!roomId || assignees.loading || !!assignees.error}
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {assignees.items.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.employeeCode} — {staff.fullName}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.staffId?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="task-create-title">
                  <Form.Label>Tiêu đề</Form.Label>
                  <Form.Control {...register('title')} maxLength={200} isInvalid={!!errors.title} />
                  <Form.Control.Feedback type="invalid">
                    {errors.title?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="task-create-type">
                  <Form.Label>Loại việc</Form.Label>
                  <Form.Select {...register('taskType')} isInvalid={!!errors.taskType}>
                    <option value="CLEANING">Dọn phòng</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.taskType?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="task-create-priority">
                  <Form.Label>Ưu tiên</Form.Label>
                  <Form.Select {...register('priority')} isInvalid={!!errors.priority}>
                    {Object.entries(PRIORITIES).map(([code, definition]) => (
                      <option key={code} value={code}>
                        {definition.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.priority?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="task-create-schedule">
                  <Form.Label>Lịch thực hiện (giờ địa phương)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    {...register('scheduledAt')}
                    isInvalid={!!errors.scheduledAt}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.scheduledAt?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="task-create-description">
                  <Form.Label>Mô tả (không bắt buộc)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    {...register('description')}
                    maxLength={2000}
                    isInvalid={!!errors.description}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.description?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </fieldset>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={retry}
            disabled={isSubmitting || rooms.loading || assignees.loading}
          >
            Tải lại dữ liệu
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting || blocked}>
            {isSubmitting ? 'Đang lưu...' : 'Tạo và giao việc'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
