import { z } from 'zod';
const required = (label) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, `${label} là bắt buộc.`));
const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().finite().positive('Diện tích phải lớn hơn 0.').optional(),
);
export const roomTypeSchema = z.object({
  name: required('Tên'),
  description: z.string().trim(),
  basePrice: z.preprocess(
    (v) => String(v ?? '').trim(),
    z
      .string()
      .regex(
        /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/,
        'Giá không âm, tối đa 16 chữ số và 2 số thập phân.',
      ),
  ),
  capacity: z.preprocess(
    (v) => (v === '' ? NaN : Number(v)),
    z.number().int('Sức chứa phải là số nguyên.').min(1, 'Tối thiểu 1 khách.'),
  ),
  area: optionalNumber,
  bedType: required('Loại giường'),
  amenityIds: z.array(z.string()),
  isActive: z.boolean(),
});
export const roomSchema = z.object({
  roomNumber: required('Số phòng'),
  floor: z.preprocess(
    (v) => (v === '' ? NaN : Number(v)),
    z.number().int('Tầng phải là số nguyên.'),
  ),
  roomTypeId: required('Loại phòng'),
  notes: z.string().trim(),
  isActive: z.boolean(),
});
export const amenitySchema = z.object({
  name: required('Tên'),
  description: z.string().trim(),
  isActive: z.boolean(),
});
