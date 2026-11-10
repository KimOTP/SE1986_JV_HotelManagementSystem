import test from 'node:test';
import assert from 'node:assert/strict';
import { canProcessIssue } from '../utils/issueActions.js';
const worker = { enabled: true, staffId: 4 };
test('only assigned worker can act on assigned or in-progress issues', () => {
  for (const status of ['ASSIGNED', 'IN_PROGRESS'])
    assert.equal(canProcessIssue({ assignedStaffId: 4, status }, worker), true);
});
test('reporter cannot act on an issue assigned to someone else', () => {
  assert.equal(
    canProcessIssue({ reportedById: 4, assignedStaffId: 5, status: 'ASSIGNED' }, worker),
    false,
  );
});
test('missing or disabled worker identity hides actions', () => {
  for (const context of [null, { enabled: false, staffId: 4 }, { enabled: true, staffId: null }])
    assert.equal(canProcessIssue({ assignedStaffId: 4, status: 'ASSIGNED' }, context), false);
});
test('open and completed issues have no worker actions', () => {
  for (const status of ['OPEN', 'RESOLVED', 'CLOSED'])
    assert.equal(canProcessIssue({ assignedStaffId: 4, status }, worker), false);
});
