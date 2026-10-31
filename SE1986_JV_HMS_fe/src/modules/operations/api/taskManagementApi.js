import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';
const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const id = z.number().int().positive();
const taskSchema = z.object({
  id,
  roomNumber: z.string(),
  hotelName: z.string(),
  taskType: z.enum(['CLEANING', 'MAINTENANCE']),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  assignedStaffId: id,
  assignedTo: z.string(),
  assignedBy: z.string(),
  scheduledAt: z.string(),
});
export async function getManagedTasks(params, signal) {
  const response = await axiosClient.get('/operations/tasks', { baseURL, params, signal });
  return z.array(taskSchema).parse(response.data);
}
export async function getTaskRooms(signal) {
  const response = await axiosClient.get('/operations/task-rooms', { baseURL, signal });
  return z
    .array(z.object({ id, roomNumber: z.string(), hotelName: z.string() }))
    .parse(response.data);
}
export async function getTaskAssignees(roomId, signal) {
  const response = await axiosClient.get('/operations/task-assignees', {
    baseURL,
    params: { roomId },
    signal,
  });
  return z
    .array(z.object({ id, fullName: z.string(), employeeCode: z.string() }))
    .parse(response.data);
}
export async function createManagedTask(data) {
  const response = await axiosClient.post('/operations/tasks', data, { baseURL });
  return z.object({ id, status: z.literal('PENDING') }).parse(response.data);
}
