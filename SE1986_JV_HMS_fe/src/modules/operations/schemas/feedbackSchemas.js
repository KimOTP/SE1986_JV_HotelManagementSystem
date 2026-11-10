import { z } from 'zod';
export const createFeedbackSchema = z.object({
  bookingId: z
    .string()
    .regex(/^[1-9]\d*$/, 'Vui lòng chọn kỳ nghỉ bạn muốn đánh giá')
    .transform(Number)
    .refine(Number.isSafeInteger, 'Kỳ nghỉ không hợp lệ. Vui lòng chọn lại.'),
  rating: z
    .string()
    .regex(/^[1-5]$/, 'Vui lòng chọn mức độ hài lòng từ 1 đến 5 sao')
    .transform(Number),
  comment: z
    .string()
    .trim()
    .min(5, 'Vui lòng chia sẻ ít nhất 5 ký tự về trải nghiệm của bạn')
    .max(2000, 'Nội dung tối đa 2000 ký tự'),
});
export const replyFeedbackSchema = z.object({
  reply: z
    .string()
    .trim()
    .min(5, 'Phản hồi ít nhất 5 ký tự')
    .max(2000, 'Phản hồi tối đa 2000 ký tự'),
});
