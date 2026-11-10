export const MAX_ROOM_IMAGES = 6;
export const MAX_ROOM_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateRoomImageSelection(files, existingCount = 0) {
  if (existingCount + files.length > MAX_ROOM_IMAGES) {
    throw new Error('Tối đa 6 ảnh, bao gồm cả ảnh đã có và ảnh vừa chọn.');
  }
  for (const file of files) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      throw new Error('Chỉ hỗ trợ ảnh JPG hoặc PNG.');
    }
    if (!file.size) throw new Error('File ảnh đang trống.');
    if (file.size > MAX_ROOM_IMAGE_BYTES) throw new Error('Mỗi ảnh tối đa 5 MB.');
  }
}
