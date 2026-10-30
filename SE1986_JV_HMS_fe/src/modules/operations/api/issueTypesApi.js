import axios from 'axios';
import { z } from 'zod';

const client = axios.create({
  baseURL: import.meta.env.VITE_OPERATIONS_API_BASE_URL || '/api',
  timeout: 15000,
});

const issueTypesSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(100),
  }),
);

export async function getIssueTypes(signal) {
  const response = await client.get('/operations/issue-types', { signal });
  return issueTypesSchema.parse(response.data);
}
