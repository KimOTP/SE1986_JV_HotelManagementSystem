import { z } from 'zod';
const selectedId = z
  .string()
  .regex(/^[1-9]\d*$/, 'Vui lòng chọn một giá trị hợp lệ')
  .transform(Number)
  .refine(Number.isSafeInteger, 'ID không hợp lệ');
const validLocalTime = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(value);
  return (
    year > 0 &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
};
export const createTaskSchema = z.object({
  roomId: selectedId,
  staffId: selectedId,
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  taskType: z.enum(['CLEANING', 'MAINTENANCE']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  scheduledAt: z.string().refine(validLocalTime, 'Vui lòng chọn ngày giờ hợp lệ'),
});
export function toTaskPayload(values) {
  return {
    ...values,
    description: values.description || null,
    scheduledAt: new Date(values.scheduledAt).toISOString().slice(0, -1),
  };
}
