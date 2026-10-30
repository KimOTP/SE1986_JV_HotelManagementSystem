import axios from 'axios';
import { z } from 'zod';

const client = axios.create({
  baseURL: import.meta.env.VITE_OPERATIONS_API_BASE_URL || '/api',
  timeout: 15000,
});
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
  createdAt: z.string(),
});
export async function getDatabaseIssues(params, signal) {
  const response = await client.get('/operations/issues', { params, signal });
  return z.array(issueSchema).parse(response.data);
}
