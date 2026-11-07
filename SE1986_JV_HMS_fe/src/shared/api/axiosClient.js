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

// Dùng chung một lần refresh khi nhiều request cùng gặp 401.
let refreshPromise = null;

function refreshAccessToken() {
  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    return Promise.reject(new Error('Missing refresh token'));
  }
  if (!refreshPromise) {
    // Gọi bằng axios gốc để không đi lại vào interceptor này.
    refreshPromise = axios
      .post(`${axiosClient.defaults.baseURL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
      .then(({ data }) => {
        localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.accessToken);
        localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const isAuthRequest = (config) => /\/auth\/(register|login|refresh|logout)$/.test(config?.url || '');

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config;
    const responseMessage =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.response?.data?.error;

    // Access token hết hạn: thử refresh một lần rồi gửi lại request.
    if (status === 401 && config && !config._retried && !isAuthRequest(config)) {
      config._retried = true;
      try {
        const accessToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(config);
      } catch {
        // Refresh thất bại thì xử lý như 401 bên dưới.
      }
    }

    if (status === 401 && !isAuthRequest(config)) {
      window.dispatchEvent(new Event('auth:unauthorized'));
      error.message =
        responseMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    } else if (status === 403) {
      error.message =
        responseMessage || 'Bạn không có quyền thực hiện thao tác này.';
    } else if (responseMessage) {
      error.message = responseMessage;
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
