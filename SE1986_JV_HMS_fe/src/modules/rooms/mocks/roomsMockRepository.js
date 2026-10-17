import { seedAmenities, seedReservations, seedRooms, seedRoomTypes } from './seedData';
import { clone, normalize, reservationBlocks } from '../utils/roomUtils';

const KEY = 'se1986.moduleB.rooms.v1';
const VERSION = 1;
const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));
const fresh = () => ({
  version: VERSION,
  roomTypes: clone(seedRoomTypes),
  rooms: clone(seedRooms),
  amenities: clone(seedAmenities),
  reservations: clone(seedReservations),
});
const load = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (parsed?.version === VERSION && Array.isArray(parsed.rooms)) return parsed;
  } catch {
    /* reset corrupted Module B storage only */
  }
  const value = fresh();
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* memory copy remains usable */
  }
  return value;
};
let memory = load();
const save = (next) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    memory = next;
  } catch {
    throw new Error('Không thể lưu dữ liệu demo. Hãy kiểm tra dung lượng hoặc quyền localStorage.');
  }
};
const collection = (kind) => clone(memory[kind]);
const unique = (kind, name, id) =>
  memory[kind].some((x) => x.id !== id && normalize(x.name) === normalize(name));
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const roomsMockRepository = {
  async getAll() {
    await delay();
    return clone(memory);
  },
  async list(kind) {
    await delay();
    return collection(kind);
  },
  async getRoomType(id) {
    await delay();
    return clone(memory.roomTypes.find((x) => x.id === id) || null);
  },
  async save(kind, input) {
    await delay();
    const item = clone(input);
    if (['roomTypes', 'amenities'].includes(kind) && unique(kind, item.name, item.id))
      throw new Error('Tên đã tồn tại.');
    if (
      kind === 'rooms' &&
      memory.rooms.some(
        (x) => x.id !== item.id && normalize(x.roomNumber) === normalize(item.roomNumber),
      )
    )
      throw new Error('Số phòng đã tồn tại.');
    if (!item.id) item.id = makeId(kind === 'rooms' ? 'room' : kind === 'roomTypes' ? 'rt' : 'am');
    const exists = memory[kind].some((x) => x.id === item.id);
    const values = exists
      ? memory[kind].map((x) => (x.id === item.id ? item : x))
      : [...memory[kind], item];
    save({ ...memory, [kind]: values });
    return clone(item);
  },
  async remove(kind, id) {
    await delay();
    const item = memory[kind].find((x) => x.id === id);
    if (!item) throw new Error('Dữ liệu không còn tồn tại.');
    const referenced =
      kind === 'roomTypes'
        ? memory.rooms.some((x) => x.roomTypeId === id)
        : kind === 'amenities'
          ? memory.roomTypes.some((x) => x.amenityIds.includes(id))
          : memory.reservations.some((x) => x.roomId === id);
    if (referenced)
      throw new Error('Dữ liệu đang được tham chiếu, không thể xóa. Hãy ngừng hoạt động thay thế.');
    save({ ...memory, [kind]: memory[kind].filter((x) => x.id !== id) });
    return true;
  },
  async search(criteria) {
    await delay(260);
    const { checkIn, checkOut, guests } = criteria;
    return memory.roomTypes
      .filter((t) => t.isActive && t.capacity >= Number(guests))
      .map((t) => {
        const sellable = memory.rooms.filter(
          (r) => r.roomTypeId === t.id && r.isActive && r.operationalStatus !== 'MAINTENANCE',
        );
        const available = sellable.filter(
          (r) =>
            !memory.reservations.some(
              (res) => res.roomId === r.id && reservationBlocks(res, checkIn, checkOut),
            ),
        ).length;
        return { ...clone(t), availableRooms: available };
      })
      .filter((t) => t.availableRooms > 0);
  },
  async availability(id, criteria) {
    const results = await this.search(criteria);
    return results.find((x) => x.id === id) || null;
  },
  reset() {
    memory = fresh();
    save(memory);
    return clone(memory);
  },
};
