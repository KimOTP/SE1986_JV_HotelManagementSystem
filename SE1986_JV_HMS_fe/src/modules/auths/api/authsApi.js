import { authsHttpRepository } from './authsHttpRepository';

// Module A chỉ dùng backend thật (JWT); không còn dữ liệu giả trên trình duyệt.
export const authsApi = authsHttpRepository;

export default authsApi;
