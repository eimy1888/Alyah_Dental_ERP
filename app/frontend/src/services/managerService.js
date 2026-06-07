// src/services/managerService.js
// ─────────────────────────────────────────────────────────────────────────────
// All HTTP calls for the Branch Manager role.
// Uses the shared apiClient (baseURL: '/api/v1', proxied by Vite to Laravel).
// Every function returns the full Axios response so callers can do:
//   const res = await getManagerDashboard();
//   const data = res.data.data;
// ─────────────────────────────────────────────────────────────────────────────
import apiClient from './axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// GET /manager/dashboard
// Returns: { data: { branch, metrics, weekly_appointments, status_breakdown,
//                    today_schedule, stock_alerts, recent_patients, ... } }
// ─────────────────────────────────────────────────────────────────────────────
export const getManagerDashboard = () =>
  apiClient.get('/manager/dashboard');

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List appointments with optional filters.
 * @param {Object} params  e.g. { date, status, search, page, per_page }
 */
export const getAppointments = (params = {}) =>
  apiClient.get('/manager/appointments', { params });

/**
 * Get a single appointment by ID.
 */
export const getAppointment = (id) =>
  apiClient.get(`/manager/appointments/${id}`);

/**
 * Create a new appointment.
 * @param {Object} data  { patient_id, dentist_id, branch_id, appointment_date,
 *                         appointment_time, type, notes }
 */
export const createAppointment = (data) =>
  apiClient.post('/manager/appointments', data);

/**
 * Update an existing appointment.
 */
export const updateAppointment = (id, data) =>
  apiClient.put(`/manager/appointments/${id}`, data);

/**
 * Patch just the status field.
 * @param {string} status  e.g. 'confirmed' | 'checked_in' | 'in_progress' |
 *                              'completed' | 'no_show' | 'cancelled'
 */
export const updateAppointmentStatus = (id, status) =>
  apiClient.patch(`/manager/appointments/${id}/status`, { status });

/**
 * Delete / cancel an appointment.
 */
export const deleteAppointment = (id) =>
  apiClient.delete(`/manager/appointments/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List patients with optional filters.
 * @param {Object} params  e.g. { search, page, per_page }
 */
export const getPatients = (params = {}) =>
  apiClient.get('/manager/patients', { params });

/**
 * Get a single patient with their appointment history.
 */
export const getPatient = (id) =>
  apiClient.get(`/manager/patients/${id}`);

/**
 * Create a new patient record.
 * @param {Object} data  { first_name, last_name, phone, email, dob, gender, address, notes }
 */
export const createPatient = (data) =>
  apiClient.post('/manager/patients', data);

/**
 * Update an existing patient.
 */
export const updatePatient = (id, data) =>
  apiClient.put(`/manager/patients/${id}`, data);

/**
 * Soft-delete a patient.
 */
export const deletePatient = (id) =>
  apiClient.delete(`/manager/patients/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List branch staff.
 * @param {Object} params  e.g. { search, role, page, per_page }
 */
export const getStaff = (params = {}) =>
  apiClient.get('/manager/staff', { params });

/**
 * Create a new staff member.
 * @param {Object} data  { name, email, phone, role, branch_id, password }
 */
export const createStaff = (data) =>
  apiClient.post('/manager/staff', data);

/**
 * Update a staff member.
 */
export const updateStaff = (id, data) =>
  apiClient.put(`/manager/staff/${id}`, data);

/**
 * Remove a staff member from the branch.
 */
export const deleteStaff = (id) =>
  apiClient.delete(`/manager/staff/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List inventory items with optional filters.
 * @param {Object} params  e.g. { search, category, filter, page, per_page }
 *                         filter: 'all' | 'low' | 'expiring'
 */
export const getInventory = (params = {}) =>
  apiClient.get('/manager/inventory', { params });

/**
 * Get transaction history for one item.
 */
export const getInventoryTransactions = (itemId) =>
  apiClient.get(`/manager/inventory/${itemId}/transactions`);

/**
 * Adjust stock for an item.
 * @param {Object} data  { quantity_change, type, notes }
 *                       type: 'reorder' | 'usage' | 'adjustment' |
 *                             'expiry_removal' | 'transfer'
 */
export const adjustInventory = (itemId, data) =>
  apiClient.post(`/manager/inventory/${itemId}/adjust`, data);

/**
 * Add a new inventory item.
 * @param {Object} data  { name, sku, category, supplier, location, branch_id,
 *                         current_quantity, reorder_threshold, unit_cost, expiry_date }
 */
export const createInventoryItem = (data) =>
  apiClient.post('/manager/inventory', data);

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the branch report summary.
 * @param {Object} params  e.g. { month: '2026-05', branch_id }
 */
export const getReport = (params = {}) =>
  apiClient.get('/manager/reports/summary', { params });

/**
 * Get revenue trend data (last N months).
 * @param {Object} params  e.g. { months: 6 }
 */
export const getRevenueTrend = (params = {}) =>
  apiClient.get('/manager/reports/revenue-trend', { params });

/**
 * Get appointment report breakdown.
 * @param {Object} params  e.g. { from, to }
 */
export const getAppointmentReport = (params = {}) =>
  apiClient.get('/manager/reports/appointments', { params });

/**
 * Get inventory/consumption report.
 * @param {Object} params  e.g. { from_date, to_date }
 */
export const getInventoryReport = (params = {}) =>
  apiClient.get('/manager/reports/inventory', { params });

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List waitlist entries.
 * @param {Object} params  e.g. { date, status }
 */
export const getWaitlist = (params = {}) =>
  apiClient.get('/manager/waitlist', { params });

/**
 * Add a patient to the waitlist.
 * @param {Object} data  { patient_id, dentist_id, preferred_date, notes }
 */
export const addToWaitlist = (data) =>
  apiClient.post('/manager/waitlist', data);

/**
 * Update waitlist entry status.
 * @param {string} status  e.g. 'scheduled' | 'removed'
 */
export const updateWaitlistEntry = (id, status) =>
  apiClient.patch(`/manager/waitlist/${id}`, { status });

/**
 * Remove from waitlist.
 */
export const removeFromWaitlist = (id) =>
  apiClient.delete(`/manager/waitlist/${id}`);

/**
 * Convert a waitlist entry to an emergency appointment.
 * POST /manager/waitlist/{id}/convert
 * @param {number} id - waitlist entry ID
 * @param {Object} data  { dentist_id, reason }
 */
export const convertWaitlistToAppointment = (id, data) =>
  apiClient.post(`/manager/waitlist/${id}/convert`, data).then((res) => res.data);

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get manager/branch settings.
 */
export const getSettings = () =>
  apiClient.get('/manager/settings');

/**
 * Update branch settings.
 * @param {Object} data  { name, location, phone, email, working_hours, ... }
 */
export const updateBranchSettings = (data) =>
  apiClient.put('/manager/settings/branch', data);

/**
 * Update the manager's own profile.
 */
export const updateProfile = (data) =>
  apiClient.put('/manager/settings/profile', data);

/**
 * Change the manager's password.
 * @param {Object} data  { current_password, password, password_confirmation }
 */
export const updatePassword = (data) =>
  apiClient.put('/manager/settings/password', data);

/**
 * Update notification preferences.
 */
export const updateNotifications = (data) =>
  apiClient.put('/manager/settings/notifications', data);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LOOKUPS  (used in forms/dropdowns across multiple manager pages)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all dentists in the branch (for appointment/waitlist forms).
 */
export const getDentists = (params = {}) =>
  apiClient.get('/manager/dentists', { params });

/**
 * Get all branches (for selects where branch switching is allowed).
 */
export const getBranches = (params = {}) =>
  apiClient.get('/manager/branches', { params });

// ─────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────
export const getAvailability = (params = {}) =>
  apiClient.get('/manager/appointments/availability', { params }).then((res) => res.data.data);
/**
 * Get the suggested dentist for a patient based on their last completed appointment.
 * GET /manager/patients/{id}/suggested-dentist
 */
export const getSuggestedDentist = (patientId) =>
  apiClient.get(`/manager/patients/${patientId}/suggested-dentist`).then((res) => res.data.data);

/**
 * Check-in an appointment (manager can override payment).
 * POST /manager/appointments/{id}/check-in
 * @param {Object} data  { override_payment?: boolean, override_reason?: string }
 */
export const checkInAppointment = (id, data = {}) =>
  apiClient.post(`/manager/appointments/${id}/check-in`, data).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// LIVE QUEUE
// ─────────────────────────────────────────────────────────────
export const getQueue = () =>
  apiClient.get('/manager/queue').then((res) => res.data.data);

export const emergencyOverride = (data) =>
  apiClient.post('/manager/queue/emergency-override', data).then((res) => res.data);

export const removeFromQueue = (id) =>
  apiClient.delete(`/manager/queue/${id}`).then((res) => res.data);


/**
 * Manually mark an appointment as no-show.
 */
export const markNoShow = (id) =>
  apiClient.put(`/manager/appointments/${id}`, { status: 'no_show' }).then((res) => res.data);


// ─────────────────────────────────────────────────────────────
// DENTIST UNAVAILABLE (NEW)
// ─────────────────────────────────────────────────────────────

/**
 * Get list of dentists with availability status
 */
export const getDentistsAvailability = async () => {
  const res = await apiClient.get('/manager/dentist-unavailable/dentists');
  return res.data;
};

/**
 * Mark a dentist as unavailable
 * @param {Object} data { dentist_id, reason, unavailable_until, notes }
 */
export const markDentistUnavailable = async (data) => {
  const res = await apiClient.post('/manager/dentist-unavailable/mark', data);
  return res.data;
};

/**
 * Mark a dentist as available again
 * @param {Object} data { dentist_id }
 */
export const markDentistAvailable = async (data) => {
  const res = await apiClient.post('/manager/dentist-unavailable/mark-available', data);
  return res.data;
};

/**
 * Get affected appointments for an unavailable dentist
 * @param {number} dentistId
 * @param {Object} params { days_ahead }
 */
export const getAffectedAppointments = async (dentistId, params = {}) => {
  const res = await apiClient.get(`/manager/dentist-unavailable/${dentistId}/affected-appointments`, { params });
  return res.data;
};

/**
 * Get available dentists for reassignment
 * @param {number} dentistId
 */
export const getAvailableDentistsForReassignment = async (dentistId) => {
  const res = await apiClient.get(`/manager/dentist-unavailable/${dentistId}/available-dentists`);
  return res.data;
};

/**
 * Reassign a single appointment to another dentist
 * @param {Object} data { appointment_id, to_dentist_id, reason }
 */
export const reassignAppointment = async (data) => {
  const res = await apiClient.post('/manager/dentist-unavailable/reassign', data);
  return res.data;
};

/**
 * Reassign all appointments for an unavailable dentist
 * @param {Object} data { dentist_id, to_dentist_id, reason }
 */
export const reassignAllAppointments = async (data) => {
  const res = await apiClient.post('/manager/dentist-unavailable/reassign-all', data);
  return res.data;
};