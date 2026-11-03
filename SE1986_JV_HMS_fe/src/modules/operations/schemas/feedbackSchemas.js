import { z } from 'zod';
export const createFeedbackSchema = z.object({
  bookingId: z
    .string()
    .regex(/^[1-9]\d*$/, 'Vui lòng chọn booking')
    .transform(Number)
    .refine(Number.isSafeInteger, 'ID không hợp lệ'),
  rating: z
    .string()
    .regex(/^[1-5]$/, 'Chọn số sao từ 1 đến 5')
    .transform(Number),
  comment: z
    .string()
    .trim()
    .min(5, 'Nội dung ít nhất 5 ký tự')
    .max(2000, 'Nội dung tối đa 2000 ký tự'),
});
export const replyFeedbackSchema = z.object({
  reply: z
    .string()
    .trim()
    .min(5, 'Phản hồi ít nhất 5 ký tự')
    .max(2000, 'Phản hồi tối đa 2000 ký tự'),
});
