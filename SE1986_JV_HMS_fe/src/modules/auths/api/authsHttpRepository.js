import axiosClient from '../../../shared/api/axiosClient';
import { authsMockRepository } from './authsMockRepository';

// Đăng nhập, refresh, đăng xuất và /me gọi backend thật (UC-A2).
// Các UC còn lại (đăng ký, hồ sơ, quản lý user/role) tạm dùng mock cho tới khi có API.
export const authsHttpRepository = {
  ...authsMockRepository,

  async login({ email, password }) {
    const { data } = await axiosClient.post('/auth/login', { email, password });
    return {
      user: data.user,
      token: data.accessToken,
      refreshToken: data.refreshToken,
    };
  },

  async getCurrentUser() {
    const { data } = await axiosClient.get('/auth/me');
    return data;
  },

  // Quyền lấy từ backend theo tài khoản đang đăng nhập, không theo bảng mặc định ở FE.
  async getPermissionsForRoles() {
    const { data } = await axiosClient.get('/auth/me');
    return Array.isArray(data?.permissions) ? data.permissions : [];
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    await axiosClient.post('/auth/logout', { refreshToken });
  },
};

export default authsHttpRepository;
