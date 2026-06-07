import apiClient from './axiosInstance';

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export const getDashboard = () =>
  apiClient.get('/patient/dashboard').then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────
export const getAppointments = (params = {}) =>
  apiClient.get('/patient/appointments', { params }).then((res) => res.data);

export const getAppointment = (id) =>
  apiClient.get(`/patient/appointments/${id}`).then((res) => res.data.data);

export const createAppointment = (data) =>
  apiClient.post('/patient/appointments', data).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// DELAY / LATE ARRIVAL
// ─────────────────────────────────────────────────────────────
export const markDelayed = (id, data) =>
  apiClient.post(`/patient/appointments/${id}/delay`, data).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// MEDICAL RECORDS
// ─────────────────────────────────────────────────────────────
export const getMedicalRecords = (params = {}) =>
  apiClient.get('/patient/medical-records', { params }).then((res) => res.data.data);

export const getMedicalRecordDetail = (type, id) =>
  apiClient.get(`/patient/medical-records/${type}/${id}`).then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// INVOICES / BILLING
// ─────────────────────────────────────────────────────────────
export const getPatientInvoices = (params = {}) =>
  apiClient.get('/patient/invoices', { params }).then((res) => res.data);

export const getPatientInvoice = (id) =>
  apiClient.get(`/patient/invoices/${id}`).then((res) => res.data.data);

export const getInvoiceSummary = () =>
  apiClient.get('/patient/invoices/summary').then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────
export const getProfile = () =>
  apiClient.get('/patient/settings/profile').then((res) => res.data.data);

export const updateProfile = (data) =>
  apiClient.put('/patient/settings/profile', data).then((res) => res.data);

export const changePassword = (data) =>
  apiClient.post('/patient/settings/change-password', data).then((res) => res.data);

export const getClinicInfo = () =>
  apiClient.get('/patient/settings/clinic-info').then((res) => res.data.data);

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = () =>
  apiClient.get('/patient/notifications').then((res) => res.data);

export const markNotificationRead = (id) =>
  apiClient.put(`/patient/notifications/${id}/read`).then((res) => res.data);

export const markAllNotificationsRead = () =>
  apiClient.put('/patient/notifications/read-all').then((res) => res.data);