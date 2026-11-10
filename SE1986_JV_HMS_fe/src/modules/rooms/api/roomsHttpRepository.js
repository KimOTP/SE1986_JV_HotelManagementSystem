import axiosClient from '../../../shared/api/axiosClient';
import { validateRoomImageSelection } from '../utils/roomImageUpload.js';

const root = '/inventory';
const resources = { roomTypes: 'room-types', rooms: 'rooms', amenities: 'amenities' };
const unwrap = (response) => response?.data?.data ?? response?.data;
const normalize = (item) => ({
  ...item,
  id: String(item.id),
  ...(item.roomTypeId != null ? { roomTypeId: String(item.roomTypeId) } : {}),
  ...(item.amenityIds ? { amenityIds: item.amenityIds.map(String) } : {}),
  ...(item.displayStatus
    ? {
        rawOperationalStatus: item.rawOperationalStatus || item.operationalStatus,
        operationalStatus: item.displayStatus,
      }
    : {}),
});
const dataset = (data) => ({
  roomTypes: (data.roomTypes || []).map(normalize),
  rooms: (data.rooms || []).map(normalize),
  amenities: (data.amenities || []).map(normalize),
});
const fields = {
  roomTypes: [
    'name',
    'description',
    'basePrice',
    'capacity',
    'area',
    'bedType',
    'images',
    'amenityIds',
    'isActive',
  ],
  rooms: ['roomNumber', 'floor', 'roomTypeId', 'notes', 'isActive'],
  amenities: ['name', 'iconKey', 'description', 'isActive'],
};
const criteriaParams = ({ checkIn, checkOut, guests }) => ({ checkIn, checkOut, guests });
export const roomsHttpRepository = {
  async uploadImage(file, { signal } = {}) {
    validateRoomImageSelection([file]);
    const result = unwrap(
      await axiosClient.post(`${root}/admin/images`, file, {
        headers: { 'Content-Type': file.type },
        signal,
      }),
    );
    if (!result?.url) throw new Error('Không nhận được đường dẫn ảnh. Vui lòng thử lại.');
    return result;
  },
  async getCatalog() {
    return dataset(unwrap(await axiosClient.get(`${root}/public/catalog`)));
  },
  async getMap() {
    return dataset(unwrap(await axiosClient.get(`${root}/room-map`)));
  },
  async getAll(kind = 'roomTypes') {
    const data = { roomTypes: [], rooms: [], amenities: [] };
    data[kind] = await this.list(kind);
    if (kind === 'rooms')
      data.roomTypes = unwrap(await axiosClient.get(`${root}/admin/rooms/options`));
    if (kind === 'roomTypes')
      data.amenities = unwrap(await axiosClient.get(`${root}/admin/room-types/options`));
    return dataset(data);
  },
  async list(kind) {
    return unwrap(await axiosClient.get(`${root}/admin/${resources[kind]}`)).map(normalize);
  },
  async getRoomType(id) {
    return normalize(unwrap(await axiosClient.get(`${root}/public/room-types/${id}`)));
  },
  async save(kind, item) {
    const body = Object.fromEntries(
      fields[kind].map((key) => [key, item[key] ?? (key === 'area' ? null : undefined)]),
    );
    const path = `${root}/admin/${resources[kind]}`;
    return normalize(
      unwrap(
        item.id
          ? await axiosClient.put(`${path}/${item.id}`, body)
          : await axiosClient.post(path, body),
      ),
    );
  },
  async remove(kind, id) {
    await axiosClient.delete(`${root}/admin/${resources[kind]}/${id}`);
    return true;
  },
  async search(criteria) {
    return unwrap(
      await axiosClient.get(`${root}/public/search`, { params: criteriaParams(criteria) }),
    ).map(normalize);
  },
  async availability(id, criteria) {
    const type = normalize(
      unwrap(
        await axiosClient.get(`${root}/public/room-types/${id}/availability`, {
          params: criteriaParams(criteria),
        }),
      ),
    );
    return type.availableRooms > 0 ? type : null;
  },
};
