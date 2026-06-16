import apiClient from './axiosInstance';

// ─── Analytics ───────────────────────────────────────────────────────────────
export const getPlatformAnalytics = () =>
  apiClient.get('/platform/analytics').then((r) => r.data);

// ─── Clinics ──────────────────────────────────────────────────────────────────
export const getClinics = (params = {}) =>
  apiClient.get('/platform/clinics', { params }).then((r) => r.data);

export const getClinic = (clinicId) =>
  apiClient.get(`/platform/clinics/${clinicId}`).then((r) => r.data);

export const approveClinic = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/approve`).then((r) => r.data);

export const rejectClinic = (clinicId, reason = '') =>
  apiClient.post(`/platform/clinics/${clinicId}/reject`, { reason }).then((r) => r.data);

export const suspendClinic = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/suspend`).then((r) => r.data);

export const reactivateClinic = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/reactivate`).then((r) => r.data);

// Subdomain control — Clinic
export const disableClinicSubdomain = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/disable-subdomain`).then((r) => r.data);

export const enableClinicSubdomain = (clinicId) =>
  apiClient.post(`/platform/clinics/${clinicId}/enable-subdomain`).then((r) => r.data);

// Subdomain control — Branch
export const disableBranchSubdomain = (branchId) =>
  apiClient.post(`/platform/branches/${branchId}/disable-subdomain`).then((r) => r.data);

export const enableBranchSubdomain = (branchId) =>
  apiClient.post(`/platform/branches/${branchId}/enable-subdomain`).then((r) => r.data);

// Plan assignment + billing
export const assignPlanToClinic = (clinicId, data) =>
  apiClient.post(`/platform/clinics/${clinicId}/assign-plan`, data).then((r) => r.data);

export const recordClinicPayment = (clinicId, data) =>
  apiClient.post(`/platform/clinics/${clinicId}/record-payment`, data).then((r) => r.data);

export const getClinicPaymentHistory = (clinicId) =>
  apiClient.get(`/platform/clinics/${clinicId}/payment-history`).then((r) => r.data);

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = (params = {}) =>
  apiClient.get('/platform/users', { params }).then((r) => r.data);

// ─── Plans ────────────────────────────────────────────────────────────────────
export const getPlatformPlans = () =>
  apiClient.get('/platform/plans').then((r) => r.data);

export const getPlan = (planId) =>
  apiClient.get(`/platform/plans/${planId}`).then((r) => r.data);

export const createPlan = (data) =>
  apiClient.post('/platform/plans', data).then((r) => r.data);

export const updatePlan = (planId, data) =>
  apiClient.put(`/platform/plans/${planId}`, data).then((r) => r.data);

export const deletePlan = (planId) =>
  apiClient.delete(`/platform/plans/${planId}`).then((r) => r.data);

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getAdminProfile = () =>
  apiClient.get('/platform/settings/profile').then((r) => r.data);

export const updateAdminProfile = (data) =>
  apiClient.put('/platform/settings/profile', data).then((r) => r.data);

export const updateAdminPassword = (data) =>
  apiClient.put('/platform/settings/password', data).then((r) => r.data);
