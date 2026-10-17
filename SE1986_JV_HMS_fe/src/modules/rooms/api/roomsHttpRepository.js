import axiosClient from '../../../shared/api/axiosClient';

const unwrap = (response) => {
  const body = response?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return body?.data ?? body;
};
export const roomsHttpRepository = {
  async getAll() {
    const [roomTypes, rooms, amenities] = await Promise.all([
      this.list('roomTypes'),
      this.list('rooms'),
      this.list('amenities'),
    ]);
    return { roomTypes, rooms, amenities, reservations: [] };
  },
  async list(kind) {
    return unwrap(await axiosClient.get(`/rooms/${kind}`));
  },
  async getRoomType(id) {
    return unwrap(await axiosClient.get(`/room-types/${id}`));
  },
  async save(kind, item) {
    const path = kind === 'roomTypes' ? 'room-types' : kind;
    return unwrap(
      item.id
        ? await axiosClient.put(`/rooms/${path}/${item.id}`, item)
        : await axiosClient.post(`/rooms/${path}`, item),
    );
  },
  async remove(kind, id) {
    const path = kind === 'roomTypes' ? 'room-types' : kind;
    await axiosClient.delete(`/rooms/${path}/${id}`);
    return true;
  },
  async search(criteria) {
    return unwrap(await axiosClient.get('/rooms/search', { params: criteria }));
  },
  async availability(id, criteria) {
    return unwrap(await axiosClient.get(`/room-types/${id}/availability`, { params: criteria }));
  },
};
