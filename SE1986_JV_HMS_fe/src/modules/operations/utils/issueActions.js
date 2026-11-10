export function canProcessIssue(issue, context) {
  return (
    !!context?.enabled &&
    Number.isSafeInteger(context.staffId) &&
    context.staffId > 0 &&
    context.staffId === issue.assignedStaffId &&
    ['ASSIGNED', 'IN_PROGRESS'].includes(issue.status)
  );
}
