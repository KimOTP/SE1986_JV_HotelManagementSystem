import axios from 'axios';
import { AUTH_STORAGE_KEYS } from '../../modules/auths/constants/authConstants';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const responseMessage =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.response?.data?.error;

    if (status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
      error.message =
        responseMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    } else if (status === 403) {
      error.message =
        responseMessage || 'Bạn không có quyền thực hiện thao tác này.';
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
