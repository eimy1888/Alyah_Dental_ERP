import apiClient from './axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS (Dashboard charts — real data)
// ─────────────────────────────────────────────────────────────────────────────

export const getPlatformAnalytics = () =>
  apiClient.get('/platform/analytics').then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// CLINICS
// ─────────────────────────────────────────────────────────────────────────────

export const getClinics = (params = {}) =>
  apiClient.get('/platform/clinics', { params }).then((r) => r.data);

export const approveClinic = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/approve`).then((r) => r.data);

export const rejectClinic = (clinicId, reason = '') =>
  apiClient.post(`/platform/clinics/${clinicId}/reject`, { reason }).then((r) => r.data);

export const suspendClinic = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/suspend`).then((r) => r.data);

export const reactivateClinic = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/reactivate`).then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export const getUsers = (params = {}) =>
  apiClient.get('/platform/users', { params }).then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────────────────────────────────────

export const getPlatformPlans = () =>
  apiClient.get('/platform/plans').then((r) => r.data);

export const createPlan = (data) =>
  apiClient.post('/platform/plans', data).then((r) => r.data);

export const updatePlan = (planId, data) =>
  apiClient.put(`/platform/plans/${planId}`, data).then((r) => r.data);

export const deletePlan = (planId) =>
  apiClient.delete(`/platform/plans/${planId}`).then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminProfile = () =>
  apiClient.get('/platform/settings/profile').then((r) => r.data);

export const updateAdminProfile = (data) =>
  apiClient.put('/platform/settings/profile', data).then((r) => r.data);

export const updateAdminPassword = (data) =>
  apiClient.put('/platform/settings/password', data).then((r) => r.data);