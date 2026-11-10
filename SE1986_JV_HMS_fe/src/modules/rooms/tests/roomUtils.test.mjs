import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localDateString,
  nightsBetween,
  parseLocalDate,
  validateSearch,
} from '../utils/roomUtils.js';

test('calendar dates reject rollover, malformed input and years outside SQL DATE', () => {
  for (const value of ['', 'invalid', '2026-02-30', '2026-04-31', '2026-13-01', '0000-01-01']) {
    assert.equal(parseLocalDate(value), null, value);
  }
  for (const value of ['0001-01-01', '2028-02-29', '9999-12-31']) {
    assert.equal(localDateString(parseLocalDate(value)), value);
  }
  assert.equal(parseLocalDate('2026-02-29'), null);
});

test('night count spans leap days and returns zero for an invalid date', () => {
  assert.equal(nightsBetween('2028-02-28', '2028-03-01'), 2);
  assert.equal(nightsBetween('2026-02-30', '2026-03-03'), 0);
});

test('search validates real future dates, checkout order and whole positive guest counts', () => {
  const today = '2026-11-10';
  const valid = { checkIn: today, checkOut: '2026-11-11', guests: '2' };
  assert.deepEqual(validateSearch(valid, today), {});
  assert.ok(validateSearch({ ...valid, checkIn: '2026-11-09' }, today).checkIn);
  assert.ok(validateSearch({ ...valid, checkOut: today }, today).checkOut);
  assert.ok(validateSearch({ ...valid, checkOut: '2027-02-30' }, today).checkOut);
  for (const guests of ['0', '-1', '1.5', 'abc']) {
    assert.ok(validateSearch({ ...valid, guests }, today).guests);
  }
});
