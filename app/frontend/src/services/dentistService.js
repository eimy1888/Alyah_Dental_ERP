import apiClient from './axiosInstance';

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export const getDashboard = () =>
  apiClient.get('/dentist/dashboard').then((res) => res.data.data);


// ── Appointments ───────────────────────────────────────────────
export const getAppointments = async (params = {}) => {
  const res = await apiClient.get('/dentist/appointments', { params });
  return res.data;
};

export const getTodayAppointments = async () => {
  const res = await apiClient.get('/dentist/appointments/today');
  return res.data;
};

export const getAppointment = async (id) => {
  const res = await apiClient.get(`/dentist/appointments/${id}`);
  return res.data;
};

export const updateAppointmentStatus = async (id, payload) => {
  const res = await apiClient.put(`/dentist/appointments/${id}/status`, payload);
  return res.data;
};

export const exportAppointments = async () => {
  const res = await apiClient.get('/dentist/appointments/export');
  return res.data;
};

// ── Live Queue ─────────────────────────────────────────────────
export const getDentistQueue = async () => {
  const res = await apiClient.get('/dentist/queue');
  return res.data;
};

export const callNextPatient = async () => {
  const res = await apiClient.post('/dentist/queue/call-next');
  return res.data;
};

// ── Recalls ────────────────────────────────────────────────────
export const getRecalls = async () => {
  const res = await apiClient.get('/dentist/recalls');
  return res.data;
};

export const setRecall = async (appointmentId, payload) => {
  const res = await apiClient.post(
    `/dentist/appointments/${appointmentId}/set-recall`,
    payload
  );
  return res.data;
};
// ─────────────────────────────────────────────────────────────
// // APPOINTMENTS
// // ─────────────────────────────────────────────────────────────
// export const getAppointments = (params = {}) =>
//   apiClient.get('/dentist/appointments', { params }).then((res) => res.data);

// export const getAppointment = (id) =>
//   apiClient.get(`/dentist/appointments/${id}`).then((res) => res.data.data);

// export const updateAppointmentStatus = (id, data) =>
//   apiClient.put(`/dentist/appointments/${id}/status`, data).then((res) => res.data);

// export const exportAppointments = () =>
//   apiClient.get('/dentist/appointments/export').then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// CLINICAL NOTES
// ─────────────────────────────────────────────────────────────
export const signClinicalNote = (id) =>
  apiClient.post(`/dentist/clinical-notes/${id}/sign`).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────
export const getPatients = (params = {}) =>
  apiClient.get('/dentist/patients', { params }).then((res) => res.data);

export const getPatient = (id) =>
  apiClient.get(`/dentist/patients/${id}`).then((res) => res.data.data);

export const addPatientNote = (id, data) =>
  apiClient.post(`/dentist/patients/${id}/notes`, data).then((res) => res.data);

export const updatePatientInsurance = (id, data) =>
  apiClient.put(`/dentist/patients/${id}/insurance`, data).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// MEDICAL RECORDS
// ─────────────────────────────────────────────────────────────
export const getMedicalRecords = (params = {}) =>
  apiClient.get('/dentist/medical-records', { params }).then((res) => res.data.data);

export const getMedicalRecordDetail = (type, id) =>
  apiClient.get(`/dentist/medical-records/${type}/${id}`).then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export const getNotifications = () =>
  apiClient.get('/dentist/notifications').then((res) => res.data.data);

export const getNotificationCount = () =>
  apiClient.get('/dentist/notifications/count').then((res) => res.data.data);

export const markNotificationsRead = (ids) =>
  apiClient.post('/dentist/notifications/mark-read', { ids }).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────
export const getProfile = () =>
  apiClient.get('/dentist/settings/profile').then((res) => res.data.data);

export const updateProfile = (data) =>
  apiClient.put('/dentist/settings/profile', data).then((res) => res.data);

export const changePassword = (data) =>
  apiClient.post('/dentist/settings/change-password', data).then((res) => res.data);

export const getClinicInfo = () =>
  apiClient.get('/dentist/settings/clinic-info').then((res) => res.data.data);

// // ─────────────────────────────────────────────────────────────
// // LIVE QUEUE
// // ─────────────────────────────────────────────────────────────
// export const getDentistQueue = () =>
//   apiClient.get('/dentist/queue').then((res) => res.data.data);

// export const callNextPatient = () =>
//   apiClient.post('/dentist/queue/call-next').then((res) => res.data);


// // ─────────────────────────────────────────────────────────────
// // RECALLS
// // ─────────────────────────────────────────────────────────────
// export const setRecall = (appointmentId, data) =>
//   apiClient.post(`/dentist/appointments/${appointmentId}/set-recall`, data).then((res) => res.data);

// export const getRecalls = () =>
//   apiClient.get('/dentist/recalls').then((res) => res.data);


// ─────────────────────────────────────────────────────────────
// REFERRALS (NEW)
// ─────────────────────────────────────────────────────────────

/**
 * Get list of available dentists for referral (excluding current dentist)
 */
export const getAvailableDentistsForReferral = async () => {
  const res = await apiClient.get('/dentist/referral/dentists');
  return res.data;
};

/**
 * Refer patient to another dentist
 * @param {Object} data { appointment_id, to_dentist_id, reason }
 */
export const referPatient = async (data) => {
  const res = await apiClient.post('/dentist/referral/refer', data);
  return res.data;
};


// ─────────────────────────────────────────────────────────────
// PROCEDURES / TREATMENT RECORDING (NEW)
// ─────────────────────────────────────────────────────────────

/**
 * Add a procedure/treatment to the patient's invoice
 * @param {Object} data { appointment_id, procedure_name, quantity, unit_price, tooth_number, notes }
 */
export const addProcedureToInvoice = async (data) => {
  const res = await apiClient.post('/dentist/medical-records/add-procedure', data);
  return res.data;
};

// /**
//  * Get all procedures for an appointment
//  * @param {number} appointmentId
//  */
// export const getAppointmentProcedures = async (appointmentId) => {
//   const res = await apiClient.get(`/dentist/medical-records/appointment/${appointmentId}/procedures`);
//   return res.data;
// };

// ─────────────────────────────────────────────────────────────
// PROCEDURES (Treatment Recording)
// ─────────────────────────────────────────────────────────────

/**
 * Get all procedures for an appointment
 * @param {number} appointmentId
 */
export const getAppointmentProcedures = async (appointmentId) => {
  const res = await apiClient.get(`/dentist/procedures/appointment/${appointmentId}`);
  return res.data;
};

/**
 * Add a procedure to an appointment
 * @param {Object} data { appointment_id, service_id, tooth_number, notes, quantity }
 */
export const addProcedure = async (data) => {
  const res = await apiClient.post('/dentist/procedures', data);
  return res.data;
};

/**
 * Delete a procedure
 * @param {number} procedureId
 */
export const deleteProcedure = async (procedureId) => {
  const res = await apiClient.delete(`/dentist/procedures/${procedureId}`);
  return res.data;
};

/**
 * Complete all procedures and mark appointment as completed
 * @param {number} appointmentId
 */
export const completeProcedures = async (appointmentId) => {
  const res = await apiClient.post(`/dentist/procedures/complete/${appointmentId}`);
  return res.data;
};