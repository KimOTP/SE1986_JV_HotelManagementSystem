import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';

const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const id = z.number().int().positive();
const contextSchema = z.object({
  enabled: z.boolean(),
  managerName: z.string().nullable(),
  message: z.string(),
});
const assigneesSchema = z.array(z.object({ id, fullName: z.string(), employeeCode: z.string() }));
const assignmentSchema = z.object({
  id,
  assignedStaffId: id,
  assignedById: id,
  status: z.literal('ASSIGNED'),
});
export async function getAssignmentContext(signal) {
  const response = await axiosClient.get('/operations/issue-assignment-context', {
    baseURL,
    signal,
  });
  return contextSchema.parse(response.data);
}
export async function getIssueAssignees(issueId, signal) {
  const response = await axiosClient.get(`/operations/issues/${issueId}/assignees`, {
    baseURL,
    signal,
  });
  return assigneesSchema.parse(response.data);
}
export async function assignIssue(issueId, staffId) {
  const response = await axiosClient.patch(
    `/operations/issues/${issueId}/assignment`,
    { staffId },
    { baseURL },
  );
  return assignmentSchema.parse(response.data);
}
