import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoomImageSelection, MAX_ROOM_IMAGE_BYTES } from '../utils/roomImageUpload.js';

test('accepts JPEG/PNG within the remaining six image slots', () => {
  assert.doesNotThrow(() =>
    validateRoomImageSelection(
      [
        { type: 'image/jpeg', size: 100 },
        { type: 'image/png', size: MAX_ROOM_IMAGE_BYTES },
      ],
      4,
    ),
  );
});
test('counts existing URLs and newly chosen files together', () => {
  assert.throws(() => validateRoomImageSelection([{ type: 'image/png', size: 10 }], 6), /6 ảnh/);
});
test('rejects empty, oversize, and unsupported files before making requests', () => {
  assert.throws(() => validateRoomImageSelection([{ type: 'image/png', size: 0 }]), /trống/);
  assert.throws(
    () => validateRoomImageSelection([{ type: 'image/png', size: MAX_ROOM_IMAGE_BYTES + 1 }]),
    /5 MB/,
  );
  assert.throws(
    () => validateRoomImageSelection([{ type: 'image/svg+xml', size: 100 }]),
    /JPG hoặc PNG/,
  );
});
