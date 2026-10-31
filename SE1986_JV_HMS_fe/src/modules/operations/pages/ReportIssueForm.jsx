import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { issueReportSchema } from '../schemas/issueReportSchema';
import { getIssueTypes } from '../api/issueTypesApi';
import {
  createDatabaseIssue,
  getIssueRooms,
  getIssueReportingContext,
} from '../api/issueReportsApi';

const defaults = { roomId: '', issueTypeId: '', title: '', description: '', priority: 'NORMAL' };
export default function ReportIssueForm() {
  const navigate = useNavigate();
  const saving = useRef(false);
  const [saveError, setSaveError] = useState(null);
  const [created, setCreated] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [catalog, setCatalog] = useState({
    rooms: [],
    types: [],
    context: null,
    loading: true,
    error: null,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(issueReportSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getIssueRooms(controller.signal),
      getIssueTypes(controller.signal),
      getIssueReportingContext(controller.signal),
    ])
      .then(([rooms, types, context]) => {
        if (!controller.signal.aborted)
          setCatalog({ rooms, types, context, loading: false, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCatalog({
            rooms: [],
            types: [],
            context: null,
            loading: false,
            error:
              'Không tải được dữ liệu form. Kiểm tra backend đã cập nhật và đang chạy, rồi thử lại.',
          });
      });
    return () => controller.abort();
  }, [attempt]);

  const disabled =
    catalog.loading ||
    !!catalog.error ||
    !catalog.context?.enabled ||
    !catalog.rooms.length ||
    !catalog.types.length;
  const onSubmit = async (data) => {
    if (saving.current || disabled) return;
    setCreated(null);
    setSaveError(null);
    if (
      !catalog.rooms.some((room) => room.id === data.roomId) ||
      !catalog.types.some((type) => type.id === data.issueTypeId)
    ) {
      setSaveError('Phòng hoặc danh mục không hợp lệ. Vui lòng tải lại form.');
      return;
    }
    saving.current = true;
    try {
      const result = await createDatabaseIssue(data);
      setCreated(result);
      reset(defaults);
    } catch (error) {
      const status = error.response?.status;
      setSaveError(
        status === 400
          ? 'Dữ liệu không hợp lệ hoặc phòng/danh mục không còn hoạt động. Vui lòng tải lại form.'
          : status === 503
            ? 'Backend chưa bật local-demo hoặc người báo cáo cấu hình không hoạt động.'
            : 'Chưa xác nhận được kết quả lưu. Kiểm tra bảng sự cố trước khi gửi lại để tránh tạo trùng.',
      );
    } finally {
      saving.current = false;
    }
  };
  const retry = () => {
    setCreated(null);
    setSaveError(null);
    setCatalog({ rooms: [], types: [], context: null, loading: true, error: null });
    setAttempt((value) => value + 1);
  };

  return (
    <Container className="mt-4" style={{ maxWidth: 700 }}>
      <Button variant="link" className="px-0 mb-3" onClick={() => navigate(-1)}>
        ← Quay lại
      </Button>
      <h2 className="fw-bold">Báo cáo sự cố</h2>
      <p className="text-muted">Chọn phòng và nhập thông tin để gửi báo cáo vào hệ thống.</p>
      {catalog.loading && (
        <Alert variant="info" role="status">
          Đang tải phòng, danh mục và cấu hình báo cáo...
        </Alert>
      )}
      {catalog.error && (
        <Alert variant="danger">
          {catalog.error}{' '}
          <Button size="sm" variant="outline-danger" onClick={retry}>
            Thử lại
          </Button>
        </Alert>
      )}
      {catalog.context && (
        <Alert variant={catalog.context.enabled ? 'info' : 'warning'}>
          {catalog.context.message}
          {catalog.context.enabled && (
            <div>
              Người báo cáo thử nghiệm: <strong>{catalog.context.reporterName}</strong>. Đây là danh
              tính cấu hình local, chưa phải tài khoản đăng nhập React.
            </div>
          )}
          {!catalog.context.enabled && (
            <Button variant="link" onClick={retry}>
              Tải lại cấu hình
            </Button>
          )}
        </Alert>
      )}
      {!catalog.loading && !catalog.error && (!catalog.rooms.length || !catalog.types.length) && (
        <Alert variant="warning">Chưa có phòng hoặc loại sự cố đang hoạt động.</Alert>
      )}
      {created && (
        <Alert variant="success">
          Đã lưu sự cố #{created.id} vào database, trạng thái Mới báo cáo.{' '}
          <Button variant="link" className="p-0" onClick={() => navigate('/operations/issues')}>
            Xem danh sách sự cố
          </Button>
        </Alert>
      )}
      {saveError && <Alert variant="danger">{saveError}</Alert>}
      <Form
        noValidate
        onSubmit={(event) => handleSubmit(onSubmit)(event)}
        className="bg-white p-4 rounded shadow-sm border mb-5"
      >
        <fieldset disabled={disabled || isSubmitting}>
          <Form.Group controlId="issue-room" className="mb-3">
            <Form.Label>Phòng</Form.Label>
            <Form.Select {...register('roomId')} isInvalid={!!errors.roomId}>
              <option value="">-- Chọn phòng --</option>
              {catalog.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.hotelName} — Phòng {room.roomNumber}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.roomId?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="issue-type" className="mb-3">
            <Form.Label>Danh mục sự cố</Form.Label>
            <Form.Select {...register('issueTypeId')} isInvalid={!!errors.issueTypeId}>
              <option value="">-- Chọn danh mục --</option>
              {catalog.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.issueTypeId?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="issue-title" className="mb-3">
            <Form.Label>Tiêu đề</Form.Label>
            <Form.Control
              {...register('title')}
              maxLength={200}
              placeholder="VD: Điều hòa không hoạt động"
              isInvalid={!!errors.title}
            />
            <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="issue-priority" className="mb-3">
            <Form.Label>Độ ưu tiên</Form.Label>
            <Form.Select {...register('priority')} isInvalid={!!errors.priority}>
              <option value="LOW">Thấp</option>
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.priority?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="issue-description" className="mb-4">
            <Form.Label>Mô tả chi tiết</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              maxLength={2000}
              {...register('description')}
              isInvalid={!!errors.description}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Button type="submit">{isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}</Button>
        </fieldset>
        <Button
          className="mt-3"
          variant="outline-secondary"
          disabled={isSubmitting}
          onClick={() => navigate(-1)}
        >
          Hủy
        </Button>
      </Form>
    </Container>
  );
}
