/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roomTypeSchema } from '../schemas/catalogSchemas';
import RoomGallery from './RoomGallery';

const defaults = {
  name: '',
  description: '',
  basePrice: '',
  capacity: '',
  area: '',
  bedType: '',
  imageText: '',
  amenityIds: [],
  isActive: true,
};
export default function RoomTypeForm({ item, amenities, onSave, onCancel, saving, saveError }) {
  const [images, setImages] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(roomTypeSchema), defaultValues: defaults });
  useEffect(() => {
    const value = item ? { ...item, imageText: '' } : defaults;
    reset(value);
    setImages(item?.images || []);
  }, [item, reset]);
  const submit = (v) => {
    const added = (v.imageText || '')
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    onSave({ ...item, ...v, images: [...images, ...added].slice(0, 6) });
  };
  return (
    <Form onSubmit={handleSubmit(submit)} noValidate>
      <Row>
        <Col md={7}>
          <Form.Group className="mb-3">
            <Form.Label>Tên loại phòng *</Form.Label>
            <Form.Control {...register('name')} isInvalid={!!errors.name} />
            <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mô tả</Form.Label>
            <Form.Control as="textarea" rows={3} {...register('description')} />
          </Form.Group>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>Giá cơ bản/đêm *</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  {...register('basePrice')}
                  isInvalid={!!errors.basePrice}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.basePrice?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>Sức chứa *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  {...register('capacity')}
                  isInvalid={!!errors.capacity}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.capacity?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>Diện tích (m²)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  {...register('area')}
                  isInvalid={!!errors.area}
                />
                <Form.Control.Feedback type="invalid">{errors.area?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>Loại giường *</Form.Label>
                <Form.Control {...register('bedType')} isInvalid={!!errors.bedType} />
                <Form.Control.Feedback type="invalid">
                  {errors.bedType?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        </Col>
        <Col md={5}>
          <Form.Label>Ảnh phòng (tối đa 6)</Form.Label>
          <RoomGallery images={images} editable onChange={setImages} />
          <Form.Text>
            Dán URL ảnh, mỗi dòng một URL. Đây là lưu demo, không phải upload server.
          </Form.Text>
          <Form.Control as="textarea" rows={2} className="mt-2" {...register('imageText')} />
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>Tiện nghi</Form.Label>
        <div className="d-flex flex-wrap gap-3">
          {amenities
            .filter((a) => a.isActive || item?.amenityIds?.includes(a.id))
            .map((a) => (
              <Form.Check
                key={a.id}
                label={`${a.name}${a.isActive ? '' : ' (đã ngừng)'}`}
                value={a.id}
                {...register('amenityIds')}
                disabled={!a.isActive && !item?.amenityIds?.includes(a.id)}
              />
            ))}
        </div>
      </Form.Group>
      <Form.Check className="mb-3" type="switch" label="Đang hoạt động" {...register('isActive')} />
      {saveError && <Alert variant="danger">{saveError}</Alert>}
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </div>
    </Form>
  );
}
