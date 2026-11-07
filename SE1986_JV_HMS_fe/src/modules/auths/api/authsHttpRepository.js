import axiosClient from '../../../shared/api/axiosClient';
import { AUTH_STORAGE_KEYS } from '../constants/authConstants';
import { authsMockRepository } from './authsMockRepository';

// Đăng ký (UC-A1), đăng nhập, refresh, đăng xuất và /me (UC-A2) gọi backend thật.
// Hồ sơ và đổi mật khẩu (UC-A4), danh sách tài khoản và đặt lại mật khẩu (UC-A3) cũng gọi backend.
// Các UC còn lại (tạo/sửa/khóa tài khoản, role) tạm dùng mock cho tới khi có API.
export const authsHttpRepository = {
  ...authsMockRepository,

  async register({ fullName, email, password }) {
    const { data } = await axiosClient.post('/auth/register', { fullName, email, password });
    return data;
  },

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

  async getUsers() {
    const { data } = await axiosClient.get('/admin/users');
    return data;
  },

  async resetUserPassword({ userId }) {
    const { data } = await axiosClient.post(`/admin/users/${userId}/reset-password`);
    return data;
  },

  async updateProfile({ fullName, phone }) {
    const { data } = await axiosClient.put('/users/me/profile', { fullName, phone });
    return data;
  },

  // Backend thu hồi mọi phiên cũ khi đổi mật khẩu nên phải lưu cặp token mới cho phiên này.
  async changePassword({ currentPassword, newPassword }) {
    const { data } = await axiosClient.put('/users/me/password', { currentPassword, newPassword });
    localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    return { success: true };
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    await axiosClient.post('/auth/logout', { refreshToken });
  },
};

export default authsHttpRepository;
