import axiosClient from '../../../shared/api/axiosClient';

/**
 * Chỉ gửi các trường backend chấp nhận. Trang tạo đơn còn mang theo dữ liệu
 * hiển thị (giá, sức chứa) cho mock; API mode bỏ qua các trường đó.
 */
const toCreatePayload = (payload) => ({
  roomTypeId: Number(payload.roomTypeId),
  checkIn: payload.checkIn,
  checkOut: payload.checkOut,
  guests: Number(payload.guests),
  rooms: Number(payload.rooms),
  customerName: payload.customerName,
  email: payload.email,
  phone: payload.phone,
  specialRequests: payload.specialRequests || null,
});

export const bookingsHttpRepository = {
  async listMine({ status = '', page = 0, size = 20 } = {}) {
    const { data } = await axiosClient.get('/bookings', {
      params: { status, page, size },
    });
    return data;
  },

  async listAll({ status = '', keyword = '', page = 0, size = 20 } = {}) {
    const response = await axiosClient.get('/bookings/manage', {
      params: { status, keyword, page, size },
    });
    const total = Number(
      response.headers['x-total-count'] ?? response.data?.length ?? 0,
    );
    return { items: response.data || [], total };
  },

  async getByCode(bookingCode) {
    const { data } = await axiosClient.get(
      `/bookings/${encodeURIComponent(bookingCode)}`,
    );
    return data;
  },

  async create(payload) {
    const { data } = await axiosClient.post('/bookings', toCreatePayload(payload));
    return data;
  },

  async cancel(bookingCode, reason) {
    const { data } = await axiosClient.post(
      `/bookings/${encodeURIComponent(bookingCode)}/cancel`,
      { reason: reason || null },
    );
    return data;
  },

  async payDeposit(bookingCode, method) {
    const { data } = await axiosClient.post(
      `/bookings/${encodeURIComponent(bookingCode)}/deposit`,
      { method },
    );
    return data;
  },
};
