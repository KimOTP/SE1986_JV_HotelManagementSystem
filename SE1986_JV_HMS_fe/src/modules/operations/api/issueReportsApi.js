import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';

const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const idSchema = z.number().int().positive();
const roomSchema = z.object({ id: idSchema, roomNumber: z.string(), hotelName: z.string() });
const contextSchema = z.object({
  enabled: z.boolean(),
  reporterName: z.string().nullable(),
  message: z.string(),
});

export async function getIssueRooms(signal) {
  const response = await axiosClient.get('/operations/issue-rooms', { baseURL, signal });
  return z.array(roomSchema).parse(response.data);
}
export async function getIssueReportingContext(signal) {
  const response = await axiosClient.get('/operations/issue-reporting-context', {
    baseURL,
    signal,
  });
  return contextSchema.parse(response.data);
}
export async function createDatabaseIssue(data) {
  const response = await axiosClient.post('/operations/issues', data, { baseURL });
  return z.object({ id: idSchema, status: z.literal('OPEN') }).parse(response.data);
}
