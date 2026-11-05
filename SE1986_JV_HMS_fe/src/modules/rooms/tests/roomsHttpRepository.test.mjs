import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const calls = [];
let response;
let failure;
globalThis.__roomsTestClient = Object.fromEntries(
  ['get', 'post', 'put', 'delete'].map((method) => [
    method,
    async (...args) => {
      calls.push([method, ...args]);
      if (failure) throw failure;
      return { data: response };
    },
  ]),
);
const source = (await readFile(new URL('../api/roomsHttpRepository.js', import.meta.url), 'utf8'))
  .replace(
    "import axiosClient from '../../../shared/api/axiosClient';",
    'const axiosClient = globalThis.__roomsTestClient;',
  )
  .replace(
    "'../utils/roomImageUpload.js'",
    JSON.stringify(new URL('../utils/roomImageUpload.js', import.meta.url).href),
  );
const { roomsHttpRepository: api } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

test('public catalog normalizes IDs without reading protected physical rooms', async () => {
  calls.length = 0;
  response = { roomTypes: [{ id: 7, amenityIds: [2] }], amenities: [{ id: 2 }] };
  const data = await api.getCatalog();
  assert.equal(data.roomTypes[0].id, '7');
  assert.deepEqual(data.roomTypes[0].amenityIds, ['2']);
  assert.deepEqual(data.rooms, []);
  assert.deepEqual(calls, [['get', '/inventory/public/catalog']]);
});
test('room map preserves raw statuses and computes UI separately', async () => {
  response = {
    rooms: [
      {
        id: 3,
        roomTypeId: 7,
        operationalStatus: 'AVAILABLE',
        housekeepingStatus: 'CLEANING',
        displayStatus: 'DIRTY',
      },
    ],
  };
  const { rooms } = await api.getMap();
  assert.equal(rooms[0].operationalStatus, 'DIRTY');
  assert.equal(rooms[0].rawOperationalStatus, 'AVAILABLE');
  assert.equal(rooms[0].housekeepingStatus, 'CLEANING');
  assert.equal(rooms[0].roomTypeId, '7');
});
test('availability zero returns null; positive count returns a DTO', async () => {
  response = { id: '7', availableRooms: 0 };
  assert.equal(await api.availability('7', {}), null);
  response = { id: 7, availableRooms: 2 };
  assert.equal((await api.availability('7', {})).availableRooms, 2);
});
test('write body excludes raw status, audit and client hotel scope', async () => {
  calls.length = 0;
  response = { id: 3 };
  await api.save('rooms', {
    id: '3',
    roomNumber: '101',
    floor: -1,
    roomTypeId: '7',
    notes: 'Note',
    isActive: true,
    operationalStatus: 'READY',
    hotelId: 99,
    rowVersion: 'fake',
  });
  assert.deepEqual(calls[0], [
    'put',
    '/inventory/admin/rooms/3',
    { roomNumber: '101', floor: -1, roomTypeId: '7', notes: 'Note', isActive: true },
  ]);
});
test('API failure propagates without any mock fallback', async () => {
  failure = new Error('Network unavailable');
  await assert.rejects(
    () => api.search({ checkIn: '2026-01-01', checkOut: '2026-01-02', guests: 1 }),
    failure,
  );
  failure = null;
});

test('upload sends binary image and its MIME type through the authenticated client', async () => {
  calls.length = 0;
  const file = new Blob(['image bytes'], { type: 'image/png' });
  const controller = new AbortController();
  response = { url: 'http://localhost:8080/api/inventory/public/images/test.png' };
  assert.deepEqual(await api.uploadImage(file, { signal: controller.signal }), response);
  assert.deepEqual(calls[0], [
    'post',
    '/inventory/admin/images',
    file,
    {
      headers: { 'Content-Type': 'image/png' },
      signal: controller.signal,
    },
  ]);
});
