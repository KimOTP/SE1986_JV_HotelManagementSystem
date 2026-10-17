import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

const schema = z.object({
  roomNumber: z.string().min(1, 'Vui lòng nhập số phòng'),
  category: z.string().min(1, 'Chọn loại sự cố'),
  description: z.string().min(5, 'Mô tả ít nhất 5 ký tự'),
});

const ReportIssueForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (data) => {
    console.log('Issue reported:', data);
    setSubmitted(true);
    reset();
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '600px' }}>
      <h2 className="mb-4">Report Issue</h2>
      {submitted && <Alert variant="success">Báo cáo thành công!</Alert>}
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Form.Group className="mb-3">
          <Form.Label>Room Number</Form.Label>
          <Form.Control {...register('roomNumber')} isInvalid={!!errors.roomNumber} />
          <Form.Control.Feedback type="invalid">{errors.roomNumber?.message}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Select {...register('category')} isInvalid={!!errors.category}>
            <option value="">-- Chọn --</option>
            <option value="Electrical">Electrical</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Furniture">Furniture</option>
            <option value="Other">Other</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.category?.message}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            {...register('description')}
            isInvalid={!!errors.description}
          />
          <Form.Control.Feedback type="invalid">
            {errors.description?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Button variant="primary" type="submit">
          Submit Report
        </Button>
      </Form>
    </Container>
  );
};

export default ReportIssueForm;
