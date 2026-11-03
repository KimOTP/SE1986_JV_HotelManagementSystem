import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';
const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const taskSchema = z.object({
  id: z.number().int().positive(),
  roomNumber: z.string(),
  issueId: z.number().int().positive().nullable(),
  taskType: z.enum(['CLEANING', 'MAINTENANCE']),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  scheduledAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export async function getMyDatabaseTasks(params, signal) {
  const response = await axiosClient.get('/operations/my-tasks', { baseURL, params, signal });
  return z.array(taskSchema).parse(response.data);
}
export async function updateMyTask(id, action) {
  if (!['start', 'complete'].includes(action)) throw new Error('Invalid task action');
  const response = await axiosClient.patch(`/operations/my-tasks/${id}/${action}`, {}, { baseURL });
  return z
    .object({
      id: z.number().int().positive(),
      status: z.literal(action === 'start' ? 'IN_PROGRESS' : 'COMPLETED'),
    })
    .parse(response.data);
}
