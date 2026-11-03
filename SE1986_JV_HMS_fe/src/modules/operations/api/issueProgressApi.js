import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';
const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const contextSchema = z.object({
  enabled: z.boolean(),
  staffId: z.number().int().positive().nullable(),
  staffName: z.string().nullable(),
  message: z.string(),
});
const progressSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['IN_PROGRESS', 'RESOLVED']),
});
export async function getIssueWorkContext(signal) {
  const response = await axiosClient.get('/operations/issue-work-context', { baseURL, signal });
  return contextSchema.parse(response.data);
}
export async function startIssue(id) {
  const response = await axiosClient.patch(`/operations/issues/${id}/start`, {}, { baseURL });
  return progressSchema.extend({ status: z.literal('IN_PROGRESS') }).parse(response.data);
}
export async function resolveIssue(id, resolutionNote) {
  const response = await axiosClient.patch(
    `/operations/issues/${id}/resolve`,
    { resolutionNote },
    { baseURL },
  );
  return progressSchema.extend({ status: z.literal('RESOLVED') }).parse(response.data);
}
