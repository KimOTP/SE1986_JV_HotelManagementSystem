import { useEffect } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { amenitySchema } from '../schemas/catalogSchemas';
import AmenityIcon, { amenityIcons } from './AmenityIcon';
const defaults = { name: '', iconKey: 'Wifi', description: '', isActive: true };
export default function AmenityForm({ item, onSave, onCancel, saving, saveError }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(amenitySchema), defaultValues: defaults });
  const iconKey = useWatch({ control, name: 'iconKey' });
  useEffect(() => reset(item || defaults), [item, reset]);
  return (
    <Form onSubmit={handleSubmit((v) => onSave({ ...item, ...v }))}>
      <Form.Group className="mb-3">
        <Form.Label>Tên tiện nghi *</Form.Label>
        <Form.Control {...register('name')} isInvalid={!!errors.name} />
        <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Biểu tượng</Form.Label>
        <div className="d-flex align-items-center gap-2">
          <AmenityIcon iconKey={iconKey} size={24} />
          <Form.Select {...register('iconKey')}>
            {Object.keys(amenityIcons).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Form.Select>
        </div>
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
