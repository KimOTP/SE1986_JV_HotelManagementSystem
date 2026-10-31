import { z } from 'zod';
export const resolveIssueSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(5, 'Ghi chú xử lý ít nhất 5 ký tự')
    .max(2000, 'Ghi chú tối đa 2000 ký tự'),
});
