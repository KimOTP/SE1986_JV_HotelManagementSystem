import { authsHttpRepository } from './authsHttpRepository';
import { authsMockRepository } from './authsMockRepository';

// Mặc định dùng backend JWT; đặt VITE_AUTH_DATA_SOURCE=mock nếu cần chạy bản demo độc lập.
export const authsDataSource = (import.meta.env.VITE_AUTH_DATA_SOURCE || 'api').toLowerCase();
export const authsApi = authsDataSource === 'api' ? authsHttpRepository : authsMockRepository;

export default authsApi;
