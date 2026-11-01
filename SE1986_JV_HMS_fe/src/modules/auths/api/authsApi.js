import { authsHttpRepository } from './authsHttpRepository';
import { authsMockRepository } from './authsMockRepository';

// mock (mặc định) hoặc api; đặt VITE_AUTH_DATA_SOURCE=api để đăng nhập bằng backend.
export const authsDataSource = (import.meta.env.VITE_AUTH_DATA_SOURCE || 'mock').toLowerCase();
export const authsApi = authsDataSource === 'api' ? authsHttpRepository : authsMockRepository;

export default authsApi;
