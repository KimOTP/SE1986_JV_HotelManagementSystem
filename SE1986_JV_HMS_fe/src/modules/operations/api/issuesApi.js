import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';

const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const issueSchema = z.object({
  id: z.number().int().positive(),
  roomNumber: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  reportedBy: z.string(),
  assignedTo: z.string().nullable(),
  assignedStaffId: z.number().int().positive().nullable(),
  createdAt: z.string(),
  resolutionNote: z.string().nullable(),
  resolvedAt: z.string().nullable(),
});
export async function getDatabaseIssues(params, signal) {
  const response = await axiosClient.get('/operations/issues', {
    baseURL,
    params,
    signal,
  });
  return z.array(issueSchema).parse(response.data);
}
