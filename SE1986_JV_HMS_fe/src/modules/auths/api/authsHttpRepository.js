import axiosClient from '../../../shared/api/axiosClient';
import { AUTH_STORAGE_KEYS } from '../constants/authConstants';

// Đăng ký (UC-A1), quên mật khẩu bằng OTP (UC-A3), đăng nhập, refresh, đăng xuất và /me (UC-A2) gọi backend thật.
// Hồ sơ và đổi mật khẩu (UC-A4), quản lý tài khoản (UC-A5), đặt lại mật khẩu (UC-A3)
// và vai trò, quyền (UC-A6) cũng gọi backend.
export const authsHttpRepository = {
  async register({ fullName, email, password }) {
    const { data } = await axiosClient.post('/auth/register', { fullName, email, password });
    return data;
  },

  async requestPasswordReset({ email }) {
    const { data } = await axiosClient.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPasswordWithOtp({ email, otp, newPassword }) {
    await axiosClient.post('/auth/reset-password', { email, otp, newPassword });
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

  async createInternalUser({ fullName, email, role, jobTitle, password }) {
    const { data } = await axiosClient.post('/admin/users', { fullName, email, role, jobTitle, password });
    return data;
  },

  async updateInternalUser({ userId, fullName, email, role, jobTitle }) {
    const { data } = await axiosClient.put(`/admin/users/${userId}`, { fullName, email, role, jobTitle });
    return data;
  },

  async setInternalUserStatus({ userId, enabled }) {
    const { data } = await axiosClient.patch(`/admin/users/${userId}/status`, { enabled });
    return data;
  },

  async getRoles() {
    const { data } = await axiosClient.get('/admin/roles');
    return data.map((role) => ({ ...role, permissions: [...role.permissions] }));
  },

  async updateRolePermissions({ role, permissions }) {
    const { data } = await axiosClient.put(`/admin/roles/${role}/permissions`, { permissions });
    return { ...data, permissions: [...data.permissions] };
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
