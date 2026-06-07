import apiClient from './axiosInstance';

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export const getDashboard = () =>
  apiClient.get('/receptionist/dashboard').then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
/// ─────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────
export const getPatients = (params = {}) =>
  apiClient.get('/receptionist/patients', { params }).then((res) => res.data);

export const getPatient = (id) =>
  apiClient.get(`/receptionist/patients/${id}`).then((res) => res.data.data);

export const createPatient = (data) =>
  apiClient.post('/receptionist/patients', data).then((res) => res.data);

export const updatePatient = (id, data) =>
  apiClient.put(`/receptionist/patients/${id}`, data).then((res) => res.data);

export const deletePatient = (id) =>
  apiClient.delete(`/receptionist/patients/${id}`).then((res) => res.data);
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────
export const getAppointments = (params = {}) =>
  apiClient.get('/receptionist/appointments', { params }).then((res) => res.data);

export const createAppointment = (data) =>
  apiClient.post('/receptionist/appointments', data).then((res) => res.data);

export const updateAppointment = (id, data) =>
  apiClient.put(`/receptionist/appointments/${id}`, data).then((res) => res.data);

export const updateAppointmentStatus = (id, status) =>
  apiClient.put(`/receptionist/appointments/${id}/status`, { status }).then((res) => res.data);

export const deleteAppointment = (id) =>
  apiClient.delete(`/receptionist/appointments/${id}`).then((res) => res.data);

export const getDentists = () =>
  apiClient.get('/receptionist/appointments/dentists').then((res) => res.data.data);


// ─────────────────────────────────────────────────────────────
// WAITLIST & LIVE QUEUE
// ─────────────────────────────────────────────────────────────
export const getWaitlist = () =>
  apiClient.get('/receptionist/waitlist').then((res) => res.data.data);

export const addToWaitlist = (data) =>
  apiClient.post('/receptionist/waitlist', data).then((res) => res.data);

export const assignWaitlist = (id, data) =>
  apiClient.put(`/receptionist/waitlist/${id}/assign`, data).then((res) => res.data);

export const removeFromWaitlist = (id) =>
  apiClient.delete(`/receptionist/waitlist/${id}`).then((res) => res.data);

export const getLiveQueue = () =>
  apiClient.get('/receptionist/live-queue').then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// BILLING
// ─────────────────────────────────────────────────────────────
export const getInvoices = (params = {}) =>
  apiClient.get('/receptionist/invoices', { params }).then((res) => res.data);

export const createInvoice = (data) =>
  apiClient.post('/receptionist/invoices', data).then((res) => res.data);

export const recordPayment = (invoiceId, data) =>
  apiClient.post(`/receptionist/invoices/${invoiceId}/payments`, data).then((res) => res.data);

export const getRecentPayments = () =>
  apiClient.get('/receptionist/payments/recent').then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────
export const getProfile = () =>
  apiClient.get('/receptionist/settings/profile').then((res) => res.data.data);

export const updateProfile = (data) =>
  apiClient.put('/receptionist/settings/profile', data).then((res) => res.data);

export const changePassword = (data) =>
  apiClient.post('/receptionist/settings/change-password', data).then((res) => res.data);

export const getBranchInfo = () =>
  apiClient.get('/receptionist/settings/branch-info').then((res) => res.data.data);

export const getNotificationCount = () =>
  apiClient.get('/receptionist/notifications/count')
    .then((res) => res.data.data?.count ?? 0);

// ─────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────
export const getAvailability = (params = {}) =>
  apiClient.get('/receptionist/appointments/availability', { params }).then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// CHECK-IN
// ─────────────────────────────────────────────────────────────
export const checkInAppointment = (id, data = {}) =>
  apiClient.post(`/receptionist/appointments/${id}/check-in`, data).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// LIVE QUEUE
// ─────────────────────────────────────────────────────────────
export const getQueue = () =>
  apiClient.get('/receptionist/queue').then((res) => res.data.data);

export const removeFromQueue = (id) =>
  apiClient.delete(`/receptionist/queue/${id}`).then((res) => res.data);


// ─────────────────────────────────────────────────────────────
// NO-SHOW MANAGEMENT
// ─────────────────────────────────────────────────────────────
export const markNoShow = (id) =>
  apiClient.put(`/receptionist/appointments/${id}/status`, { status: 'no_show' }).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
// export const getNotificationCount = () =>
//   apiClient.get('/receptionist/notifications/count')
//     .then((res) => {
//       if (res.data?.count !== undefined) return res.data.count;
//       if (res.data?.data?.count !== undefined) return res.data.data.count;
//       if (res.data?.unread !== undefined) return res.data.unread;
//       return 0;
//     });

export const getNotifications = () =>
  apiClient.get('/receptionist/notifications')
    .then((res) => {
      if (res.data?.data?.data) {
        return { data: res.data.data.data, unread: res.data.data.unread };
      }
      if (res.data?.data) {
        return { data: res.data.data, unread: res.data.unread };
      }
      return { data: res.data?.notifications || [], unread: res.data?.unread || 0 };
    });

export const markNotificationRead = (id) =>
  apiClient.put(`/receptionist/notifications/${id}/read`).then((res) => res.data);

export const markAllNotificationsRead = () =>
  apiClient.put('/receptionist/notifications/read-all').then((res) => res.data);