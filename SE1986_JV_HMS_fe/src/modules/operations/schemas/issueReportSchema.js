import { z } from 'zod';

const selectedId = z
  .string()
  .regex(/^[1-9]\d*$/, 'Vui lòng chọn một giá trị hợp lệ')
  .transform(Number)
  .refine(Number.isSafeInteger, 'ID không hợp lệ');
export const issueReportSchema = z.object({
  roomId: selectedId,
  issueTypeId: selectedId,
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z
    .string()
    .trim()
    .min(5, 'Mô tả ít nhất 5 ký tự')
    .max(2000, 'Mô tả tối đa 2000 ký tự'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
});
