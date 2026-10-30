import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { issueSchema } from '../schemas/issueSchema';
import { z } from 'zod';
import { getIssueTypes } from '../api/issueTypesApi';
import { createDemoIssue } from '../mocks/issueStore';
import { useAuth } from '../../../app/provider/AuthsContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

const ReportIssueForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saveError, setSaveError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [catalog, setCatalog] = useState({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getIssueTypes(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setCatalog({ items, loading: false, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCatalog({
            items: [],
            loading: false,
            error: 'Không tải được danh mục. Hãy kiểm tra backend đang chạy ở cổng 8080.',
          });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  const formSchema = issueSchema.omit({ category: true, issueTypeId: true }).extend({
    issueTypeId: z
      .string()
      .refine(
        (id) => catalog.items.some((item) => String(item.id) === id),
        'Vui lòng chọn loại sự cố hợp lệ',
      ),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { roomNumber: '', issueTypeId: '', description: '' },
  });

  const onSubmit = (data) => {
    setSubmitted(false);
    setSaveError(null);
    try {
      const selectedType = catalog.items.find((item) => String(item.id) === data.issueTypeId);
      if (!selectedType) throw new Error('Invalid issue type');
      createDemoIssue(
        { ...data, issueTypeId: selectedType.id, category: selectedType.name },
        user?.fullName || user?.name || user?.email,
      );
      setSubmitted(true);
      reset();
    } catch {
      setSaveError('Không thể lưu báo cáo demo. Hãy kiểm tra bộ nhớ trình duyệt và thử lại.');
    }
  };

  return (
    <Container className="mt-4" style={{ maxWidth: '650px' }}>
      {/* Nút quay lại */}
      <Button
        variant="link"
        className="text-decoration-none px-0 mb-3 text-secondary fw-semibold"
        onClick={() => navigate(-1)}
      >
        &larr; Quay lại
      </Button>

      {/* Tiêu đề và mô tả */}
      <h2 className="mb-2 fw-bold">Báo cáo sự cố</h2>
      <p className="text-muted mb-4">
        Vui lòng điền thông tin chi tiết về sự cố tại phòng. Hiện báo cáo được lưu demo trên trình
        duyệt này.
      </p>

      {/* Thông báo thành công */}
      {submitted && (
        <Alert variant="success" className="shadow-sm">
          Đã lưu báo cáo demo.{' '}
          <Button variant="link" className="p-0" onClick={() => navigate('/operations/issues')}>
            Xem danh sách sự cố
          </Button>
        </Alert>
      )}

      {saveError && <Alert variant="danger">{saveError}</Alert>}
      {catalog.error && (
        <Alert variant="danger">
          {catalog.error}{' '}
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => {
              setCatalog({ items: [], loading: true, error: null });
              setAttempt((value) => value + 1);
            }}
          >
            Thử lại
          </Button>
        </Alert>
      )}
      {!catalog.loading && !catalog.error && catalog.items.length === 0 && (
        <Alert variant="warning">Chưa có loại sự cố đang hoạt động trong database.</Alert>
      )}

      {/* Form nhập liệu */}
      <Form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-4 rounded shadow-sm border mb-5"
      >
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Số phòng</Form.Label>
          <Form.Control
            type="text"
            placeholder="VD: 102"
            {...register('roomNumber')}
            isInvalid={!!errors.roomNumber}
          />
          <Form.Control.Feedback type="invalid">{errors.roomNumber?.message}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Danh mục sự cố</Form.Label>
          <Form.Select
            {...register('issueTypeId')}
            isInvalid={!!errors.issueTypeId}
            disabled={catalog.loading || !!catalog.error || catalog.items.length === 0}
          >
            <option value="">
              {catalog.loading ? 'Đang tải danh mục...' : '-- Chọn danh mục --'}
            </option>
            {catalog.items.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.issueTypeId?.message}
          </Form.Control.Feedback>
          <Form.Text>
            Danh mục lấy từ database; báo cáo vẫn được lưu demo trên trình duyệt.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold">Mô tả chi tiết</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Mô tả cụ thể tình trạng sự cố..."
            {...register('description')}
            isInvalid={!!errors.description}
          />
          <Form.Control.Feedback type="invalid">
            {errors.description?.message}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Nút gửi / Hủy */}
        <div className="d-flex justify-content-end gap-2">
          <Button variant="outline-secondary" type="button" onClick={() => navigate(-1)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={
              isSubmitting || catalog.loading || !!catalog.error || catalog.items.length === 0
            }
          >
            Gửi báo cáo
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default ReportIssueForm;
