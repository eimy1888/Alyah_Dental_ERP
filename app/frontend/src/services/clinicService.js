import apiClient from './axiosInstance';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getAdminDashboard = () =>
  apiClient.get('/admin/dashboard').then((r) => r.data);

// ── Branches ──────────────────────────────────────────────────────────────────
export const getBranches = () =>
  apiClient.get('/admin/branches').then((r) => r.data);

export const createBranch = (data) =>
  apiClient.post('/admin/branches', data).then((r) => r.data);

export const updateBranch = (id, data) =>
  apiClient.put(`/admin/branches/${id}`, data).then((r) => r.data);

export const deleteBranch = (id) =>
  apiClient.delete(`/admin/branches/${id}`).then((r) => r.data);

// ── Staff ─────────────────────────────────────────────────────────────────────
export const getStaff = () =>
  apiClient.get('/admin/staff').then((r) => r.data);

export const createStaff = (data) =>
  apiClient.post('/admin/staff', data).then((r) => r.data);

export const updateStaff = (id, data) =>
  apiClient.put(`/admin/staff/${id}`, data).then((r) => r.data);

export const deleteStaff = (id) =>
  apiClient.delete(`/admin/staff/${id}`).then((r) => r.data);

// ── Patients ──────────────────────────────────────────────────────────────────
export const getPatients = (params = {}) =>
  apiClient.get('/admin/patients', { params }).then((r) => r.data);

export const createPatient = (data) =>
  apiClient.post('/admin/patients', data).then((r) => r.data);

export const getPatient = (id) =>
  apiClient.get(`/admin/patients/${id}`).then((r) => r.data);

export const updatePatient = (id, data) =>
  apiClient.put(`/admin/patients/${id}`, data).then((r) => r.data);

export const deletePatient = (id) =>
  apiClient.delete(`/admin/patients/${id}`).then((r) => r.data);

// ── Inventory ─────────────────────────────────────────────────────────────────
export const getInventory = () =>
  apiClient.get('/admin/inventory').then((r) => r.data);

export const createInventoryItem = (data) =>
  apiClient.post('/admin/inventory', data).then((r) => r.data);

export const updateInventoryItem = (id, data) =>
  apiClient.put(`/admin/inventory/${id}`, data).then((r) => r.data);

export const deleteInventoryItem = (id) =>
  apiClient.delete(`/admin/inventory/${id}`).then((r) => r.data);

export const adjustInventoryItem = (id, data) =>
  apiClient.post(`/admin/inventory/${id}/adjust`, data).then((r) => r.data);

export const getInventoryTransactions = (id) =>
  apiClient.get(`/admin/inventory/${id}/transactions`).then((r) => r.data);

// ── Billing ───────────────────────────────────────────────────────────────────
export const getInvoices = (params = {}) =>
  apiClient.get('/admin/billing/invoices', { params }).then((r) => r.data);

export const createInvoice = (data) =>
  apiClient.post('/admin/billing/invoices', data).then((r) => r.data);

export const getInvoice = (id) =>
  apiClient.get(`/admin/billing/invoices/${id}`).then((r) => r.data);

export const recordPayment = (invoiceId, data) =>
  apiClient.post(`/admin/billing/invoices/${invoiceId}/pay`, data).then((r) => r.data);

export const getPayments = () =>
  apiClient.get('/admin/billing/payments').then((r) => r.data);

export const getWeeklyCollections = () =>
  apiClient.get('/admin/billing/weekly-collections').then((r) => r.data);

// ── Finance ───────────────────────────────────────────────────────────────────
export const getFinanceSummary = () =>
  apiClient.get('/admin/finance/summary').then((r) => r.data);

export const getRevenueTrend = () =>
  apiClient.get('/admin/finance/revenue-trend').then((r) => r.data);

export const getBranchBreakdown = () =>
  apiClient.get('/admin/finance/branch-breakdown').then((r) => r.data);

export const getExpenses = () =>
  apiClient.get('/admin/finance/expenses').then((r) => r.data);

export const createExpense = (data) =>
  apiClient.post('/admin/finance/expenses', data).then((r) => r.data);

export const deleteExpense = (id) =>
  apiClient.delete(`/admin/finance/expenses/${id}`).then((r) => r.data);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getReports = () =>
  apiClient.get('/admin/reports').then((r) => r.data);

export const generateReport = (id) =>
  apiClient.post(`/admin/reports/${id}/generate`).then((r) => r.data);

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings = () =>
  apiClient.get('/admin/settings').then((r) => r.data);

export const updateClinicSettings = (data) =>
  apiClient.put('/admin/settings/clinic', data).then((r) => r.data);

export const updateAdminSettings = (data) =>
  apiClient.put('/admin/settings/admin', data).then((r) => r.data);

export const updateAdminPassword = (data) =>
  apiClient.put('/admin/settings/password', data).then((r) => r.data);

export const updateNotificationSettings = (data) =>
  apiClient.put('/admin/settings/notifications', data).then((r) => r.data);

export const updateTaxInvoiceSettings = (data) =>
  apiClient.put('/admin/settings/tax-invoice', data).then((r) => r.data);