import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';
const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const count = z.number().int().nonnegative();
const dashboardSchema = z.object({
  allTime: z.boolean(),
  date: z.string(),
  zone: z.string(),
  generatedAt: z.string(),
  summary: z.object({
    total: count,
    pending: count,
    inProgress: count,
    completed: count,
    cancelled: count,
    highPriorityOpen: count,
    overdue: count,
  }),
  workload: z.array(
    z.object({
      staffId: z.number(),
      fullName: z.string(),
      employeeCode: z.string(),
      hotelName: z.string(),
      active: z.boolean(),
      pending: count,
      inProgress: count,
      completed: count,
      cancelled: count,
    }),
  ),
  urgentTasks: z.array(
    z.object({
      id: z.number(),
      roomNumber: z.string(),
      title: z.string(),
      priority: z.string(),
      status: z.string(),
      assignedTo: z.string(),
      scheduledAt: z.string(),
    }),
  ),
  openIssues: z.array(
    z.object({ id: z.number(), roomNumber: z.string(), title: z.string(), status: z.string() }),
  ),
});
export async function getHousekeepingDashboard(date, zone, signal, allTime = false) {
  const response = await axiosClient.get('/operations/dashboard', {
    baseURL,
    params: { date, zone, allTime },
    signal,
  });
  return dashboardSchema.parse(response.data);
}
