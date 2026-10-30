import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';

const baseURL =
  import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;

const issueTypesSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(100),
  }),
);

export async function getIssueTypes(signal) {
  const response = await axiosClient.get('/operations/issue-types', {
    baseURL,
    signal,
  });
  return issueTypesSchema.parse(response.data);
}
