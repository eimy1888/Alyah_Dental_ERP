import apiClient from './axiosInstance';

export const getLabDashboard = () =>
  apiClient.get('/lab/dashboard').then(r => r.data.data);

export const getLabOrders = (params) =>
  apiClient.get('/lab/orders', { params }).then(r => r.data);

export const getLabOrder = (id) =>
  apiClient.get(`/lab/orders/${id}`).then(r => r.data.data);

export const updateLabOrderStatus = (id, status, notes) =>
  apiClient.put(`/lab/orders/${id}/status`, { status, notes }).then(r => r.data);

export const addLabOrderNote = (id, note) =>
  apiClient.post(`/lab/orders/${id}/notes`, { note }).then(r => r.data);
