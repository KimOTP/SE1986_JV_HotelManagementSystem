import axios from 'axios';

// Đổi URL này sau khi có backend chính thức
const api = axios.create({ baseURL: 'http://localhost:8080/api' });

// UC-E1, E2, E3
export const getTasks = () => api.get('/housekeeping/tasks');
export const updateTaskStatus = (id, status) => api.patch(`/housekeeping/tasks/${id}`, { status });

// UC-E4, E5
export const reportIssue = (data) => api.post('/issues', data);
export const getIssues = () => api.get('/issues');

// UC-E6
export const getFeedbacks = () => api.get('/feedbacks');
