export const ISSUE_STATUSES = {
  OPEN: { label: 'Mới báo cáo', color: 'danger', text: 'white' },
  ASSIGNED: { label: 'Đã phân công', color: 'info', text: 'dark' },
  IN_PROGRESS: { label: 'Đang xử lý', color: 'warning', text: 'dark' },
  RESOLVED: { label: 'Đã xử lý', color: 'success', text: 'white' },
  CLOSED: { label: 'Đã đóng', color: 'secondary', text: 'white' },
};

export const TASK_STATUSES = {
  PENDING: { label: 'Chờ xử lý', color: 'secondary', text: 'white' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'warning', text: 'dark' },
  COMPLETED: { label: 'Đã hoàn thành', color: 'success', text: 'white' },
  CANCELLED: { label: 'Đã hủy', color: 'dark', text: 'white' },
};

export const PRIORITIES = {
  LOW: { label: 'Thấp', color: 'secondary', text: 'white' },
  NORMAL: { label: 'Bình thường', color: 'primary', text: 'white' },
  HIGH: { label: 'Cao', color: 'warning', text: 'dark' },
  URGENT: { label: 'Khẩn cấp', color: 'danger', text: 'white' },
};

const unknown = { label: 'Không xác định', color: 'secondary', text: 'white' };
export const getIssueStatus = (code) =>
  Object.hasOwn(ISSUE_STATUSES, code) ? ISSUE_STATUSES[code] : unknown;
export const getPriority = (code) => (Object.hasOwn(PRIORITIES, code) ? PRIORITIES[code] : unknown);
export const getTaskStatus = (code) =>
  Object.hasOwn(TASK_STATUSES, code) ? TASK_STATUSES[code] : unknown;
