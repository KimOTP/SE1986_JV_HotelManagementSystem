import { z } from 'zod';

export const issueCategories = ['Electrical', 'Plumbing', 'Furniture', 'Other'];

export const issueSchema = z.object({
  roomNumber: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số phòng')
    .max(20, 'Số phòng tối đa 20 ký tự'),
  category: z.string().trim().min(1, 'Vui lòng chọn loại sự cố').max(100),
  issueTypeId: z.number().int().positive().optional(),
  description: z
    .string()
    .trim()
    .min(5, 'Mô tả sự cố ít nhất 5 ký tự')
    .max(2000, 'Mô tả tối đa 2000 ký tự'),
});
