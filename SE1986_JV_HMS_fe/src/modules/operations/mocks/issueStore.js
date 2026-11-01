import { z } from 'zod';
import { mockIssues } from './mockData';
import { issueSchema } from '../schemas/issueSchema';

const STORAGE_KEY = 'se1986.moduleE.issues.v1';
const storedIssuesSchema = z.array(
  issueSchema.extend({
    id: z.union([z.string().min(1), z.number().int().positive()]),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
    reportedBy: z.string(),
    assignedTo: z.string().nullable(),
    createdAt: z.string(),
  }),
);

// Demo repository only. Storage errors must reach the UI; never claim a failed write succeeded.
export function getDemoIssues() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return mockIssues.map((issue) => ({ ...issue }));
  return storedIssuesSchema.parse(JSON.parse(stored));
}

export function createDemoIssue(values, reportedBy) {
  const data = issueSchema.parse(values);
  const issue = {
    ...data,
    id: crypto.randomUUID(),
    status: 'OPEN',
    reportedBy: reportedBy || 'Người dùng demo',
    assignedTo: null,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([issue, ...getDemoIssues()]));
  return issue;
}

export function resolveDemoIssue(id) {
  const issues = getDemoIssues();
  if (!issues.some((issue) => issue.id === id)) throw new Error('Issue not found');
  const updated = issues.map((issue) =>
    issue.id === id ? { ...issue, status: 'RESOLVED' } : issue,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
