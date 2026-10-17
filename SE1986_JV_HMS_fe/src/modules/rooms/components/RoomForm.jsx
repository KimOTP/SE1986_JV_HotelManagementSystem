import { useEffect } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roomSchema } from '../schemas/catalogSchemas';
const defaults = { roomNumber: '', floor: '', roomTypeId: '', notes: '', isActive: true };
export default function RoomForm({ item, roomTypes, onSave, onCancel, saving, saveError }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(roomSchema), defaultValues: defaults });
  useEffect(() => reset(item ? { ...item } : defaults), [item, reset]);
  return (
    <Form
      onSubmit={handleSubmit((v) =>
        onSave({ ...item, ...v, operationalStatus: item?.operationalStatus || 'READY' }),
      )}
    >
      <Form.Group className="mb-3">
        <Form.Label>Số phòng *</Form.Label>
        <Form.Control {...register('roomNumber')} isInvalid={!!errors.roomNumber} />
        <Form.Control.Feedback type="invalid">{errors.roomNumber?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Tầng *</Form.Label>
        <Form.Control type="number" {...register('floor')} isInvalid={!!errors.floor} />
        <Form.Text>Cho phép tầng 0 và tầng hầm (số âm).</Form.Text>
        <Form.Control.Feedback type="invalid">{errors.floor?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Loại phòng *</Form.Label>
        <Form.Select {...register('roomTypeId')} isInvalid={!!errors.roomTypeId}>
          <option value="">-- Chọn --</option>
          {roomTypes
            .filter((t) => t.isActive || t.id === item?.roomTypeId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isActive ? '' : ' (đã ngừng)'}
              </option>
            ))}
        </Form.Select>
        <Form.Control.Feedback type="invalid">{errors.roomTypeId?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Ghi chú</Form.Label>
        <Form.Control as="textarea" {...register('notes')} />
      </Form.Group>
      <Form.Check type="switch" className="mb-3" label="Đang sử dụng" {...register('isActive')} />
      {item && (
        <Alert variant="info">
          Trạng thái vận hành chỉ thay đổi qua quy trình vận hành; form này không cho chuyển tùy ý
          sang Đang có khách.
        </Alert>
      )}
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
