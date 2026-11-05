/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roomTypeSchema } from '../schemas/catalogSchemas';
import RoomGallery from './RoomGallery';
import { roomsApi } from '../api/roomsApi';
import { validateRoomImageSelection } from '../utils/roomImageUpload';

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
  const [imageError, setImageError] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadController = useRef(null);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(roomTypeSchema), defaultValues: defaults });
  useEffect(() => {
    uploadController.current?.abort();
    uploadController.current = null;
    const value = item ? { ...item, imageText: '' } : defaults;
    reset(value);
    setImages(item?.images || []);
    setImageError('');
    setUploading(false);
    return () => uploadController.current?.abort();
  }, [item, reset]);
  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const pending = (getValues('imageText') || '')
      .split(/\r?\n/)
      .filter((line) => line.trim()).length;
    try {
      validateRoomImageSelection(files, images.length + pending);
    } catch (error) {
      setImageError(error.message);
      return;
    }
    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);
    setImageError('');
    try {
      for (const file of files) {
        const result = await roomsApi.uploadImage(file, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setImages((current) => [...current, result.url]);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setImageError(error?.response?.data?.message || error.message);
    } finally {
      if (uploadController.current === controller && !controller.signal.aborted)
        setUploading(false);
    }
  };
  const submit = (v) => {
    if (uploading) return;
    const added = (v.imageText || '')
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (images.length + added.length > 6) {
      setImageError('Tối đa 6 ảnh. Hãy xóa bớt URL trước khi lưu.');
      return;
    }
    setImageError('');
    onSave({ ...item, ...v, images: [...images, ...added] });
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
          <RoomGallery images={images} editable={!saving && !uploading} onChange={setImages} />
          {roomsApi.uploadImage && (
            <Form.Group className="mt-3">
              <Form.Label>Chọn ảnh từ máy</Form.Label>
              <Form.Control
                type="file"
                accept="image/jpeg,image/png"
                multiple
                disabled={saving || uploading || images.length >= 6}
                onChange={upload}
              />
              <Form.Text>
                JPG/PNG, tối đa 5 MB mỗi ảnh. Bấm Lưu để gắn ảnh vào loại phòng.
              </Form.Text>
            </Form.Group>
          )}
          {uploading && (
            <div className="text-muted small mt-2" role="status">
              Đang tải ảnh lên…
            </div>
          )}
          <Form.Text>Dán URL ảnh http/https, mỗi dòng một URL, tối đa 6 ảnh.</Form.Text>
          <Form.Control
            as="textarea"
            rows={2}
            className="mt-2"
            disabled={uploading || saving}
            {...register('imageText')}
          />
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
      {imageError && <Alert variant="danger">{imageError}</Alert>}
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </div>
    </Form>
  );
}
