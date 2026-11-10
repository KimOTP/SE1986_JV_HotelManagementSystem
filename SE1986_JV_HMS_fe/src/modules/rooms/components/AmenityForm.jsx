import { useEffect } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { amenitySchema } from '../schemas/catalogSchemas';
const defaults = { name: '', description: '', isActive: true };
export default function AmenityForm({ item, onSave, onCancel, saving, saveError }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(amenitySchema), defaultValues: defaults });
  useEffect(() => reset(item || defaults), [item, reset]);
  return (
    <Form onSubmit={handleSubmit((v) => onSave({ ...item, ...v }))}>
      <Form.Group className="mb-3">
        <Form.Label>Tên tiện nghi *</Form.Label>
        <Form.Control {...register('name')} isInvalid={!!errors.name} />
        <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Mô tả</Form.Label>
        <Form.Control as="textarea" rows={3} {...register('description')} />
      </Form.Group>
      <Form.Check type="switch" className="mb-3" label="Đang hoạt động" {...register('isActive')} />
      {saveError && <Alert variant="danger">{saveError}</Alert>}
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </div>
    </Form>
  );
}
