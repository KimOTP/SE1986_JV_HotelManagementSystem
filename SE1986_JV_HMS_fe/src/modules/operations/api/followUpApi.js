import axiosClient from '../../../shared/api/axiosClient';
const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
export async function getWorkManagement(kind, id, signal) {
  const { data } = await axiosClient.get('/operations/' + kind + '/' + id + '/management', {
    baseURL,
    signal,
  });
  return data;
}
export async function changeWork(kind, id, payload) {
  await axiosClient.patch('/operations/' + kind + '/' + id + '/management', payload, { baseURL });
}
export async function getMyReports(page, signal) {
  const { data } = await axiosClient.get('/operations/my-issue-reports', {
    baseURL,
    signal,
    params: { page, size: 5 },
  });
  return data;
}
