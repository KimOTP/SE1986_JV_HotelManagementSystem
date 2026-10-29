import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { issueSchema } from '../schemas/issueSchema';
import { createDemoIssue } from '../mocks/issueStore';
import { useAuth } from '../../../app/provider/AuthsContext';
import { useState } from 'react';
import { useNavigate } from 'react-router';

const ReportIssueForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saveError, setSaveError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: { roomNumber: '', category: '', description: '' },
  });

  const onSubmit = (data) => {
    setSubmitted(false);
    setSaveError(null);
    try {
      createDemoIssue(data, user?.fullName || user?.name || user?.email);
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
          <Form.Select {...register('category')} isInvalid={!!errors.category}>
            <option value="">-- Chọn danh mục --</option>
            <option value="Electrical">Điện (Electrical)</option>
            <option value="Plumbing">Đường ống nước (Plumbing)</option>
            <option value="Furniture">Nội thất (Furniture)</option>
            <option value="Other">Khác (Other)</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.category?.message}</Form.Control.Feedback>
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
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            Gửi báo cáo
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default ReportIssueForm;
