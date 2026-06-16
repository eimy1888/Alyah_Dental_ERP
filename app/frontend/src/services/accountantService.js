import apiClient from './axiosInstance';

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export const getDashboard = () =>
  apiClient.get('/accountant/dashboard').then((res) => res.data.data);

// ─────────────────────────────────────────────────────────────
// REVENUE
// ─────────────────────────────────────────────────────────────
export const getRevenue = (params = {}) =>
  apiClient.get('/accountant/revenue', { params }).then((res) => res.data.data);

export const exportRevenue = () =>
  apiClient.get('/accountant/revenue/export').then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────
export const getExpenses = (params = {}) =>
  apiClient.get('/accountant/expenses', { params }).then((res) => res.data);

export const getExpenseBudget = () =>
  apiClient.get('/accountant/expenses/budget').then((res) => res.data.data);

export const getExpenseCategories = () =>
  apiClient.get('/accountant/expenses/categories').then((res) => res.data.data);

export const createExpense = (data) =>
  apiClient.post('/accountant/expenses', data).then((res) => res.data);

export const updateExpense = (id, data) =>
  apiClient.put(`/accountant/expenses/${id}`, data).then((res) => res.data);

export const deleteExpense = (id) =>
  apiClient.delete(`/accountant/expenses/${id}`).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// BILLING - INVOICES
// ─────────────────────────────────────────────────────────────
export const getInvoices = (params = {}) =>
  apiClient.get('/accountant/invoices', { params }).then((res) => res.data);

export const getInvoice = (id) =>
  apiClient.get(`/accountant/invoices/${id}`).then((res) => res.data.data);

export const createInvoice = (data) =>
  apiClient.post('/accountant/invoices', data).then((res) => res.data);

export const recordPayment = (invoiceId, data) =>
  apiClient.post(`/accountant/invoices/${invoiceId}/payments`, data).then((res) => res.data);

export const exportInvoices = () =>
  apiClient.get('/accountant/invoices/export').then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// BILLING - INSURANCE CLAIMS
// ─────────────────────────────────────────────────────────────
export const getClaims = (params = {}) =>
  apiClient.get('/accountant/claims', { params }).then((res) => res.data);

export const createClaim = (data) =>
  apiClient.post('/accountant/claims', data).then((res) => res.data);

export const updateClaimStatus = (id, status) =>
  apiClient.put(`/accountant/claims/${id}/status`, { status }).then((res) => res.data);

export const uploadClaimDocument = (id, file) => {
  const formData = new FormData();
  formData.append('document', file);
  return apiClient.post(`/accountant/claims/${id}/documents`, formData).then((res) => res.data);
};

// ─────────────────────────────────────────────────────────────
// BILLING - TAXES
// ─────────────────────────────────────────────────────────────
export const getTaxes = (params = {}) =>
  apiClient.get('/accountant/taxes', { params }).then((res) => res.data.data);

export const payTax = (id) =>
  apiClient.post(`/accountant/taxes/${id}/pay`).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────
export const getReportTypes = () =>
  apiClient.get('/accountant/reports/types').then((res) => res.data.data);

export const generateReport = (data) =>
  apiClient.post('/accountant/reports/generate', data).then((res) => res.data);

export const getGeneratedReports = (params = {}) =>
  apiClient.get('/accountant/reports/generated', { params }).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// FISCAL YEAR
// ─────────────────────────────────────────────────────────────
export const getFiscalYears = () =>
  apiClient.get('/accountant/reports/fiscal-years').then((res) => res.data.data);

export const createFiscalYear = (data) =>
  apiClient.post('/accountant/reports/fiscal-years', data).then((res) => res.data);

export const getPeriods = (fiscalYearId) =>
  apiClient.get(`/accountant/reports/fiscal-years/${fiscalYearId}/periods`).then((res) => res.data.data);

export const closePeriod = (periodId) =>
  apiClient.post(`/accountant/reports/periods/${periodId}/close`).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────
export const getProfile = () =>
  apiClient.get('/accountant/settings/profile').then((res) => res.data.data);

export const updateProfile = (data) =>
  apiClient.put('/accountant/settings/profile', data).then((res) => res.data);

export const changePassword = (data) =>
  apiClient.post('/accountant/settings/change-password', data).then((res) => res.data);

export const getClinicInfo = () =>
  apiClient.get('/accountant/settings/clinic-info').then((res) => res.data.data);

export const getFilters = () =>
  apiClient.get('/accountant/settings/filters').then((res) => res.data.data);

export const getAccountantPatients = (params = {}) =>
  apiClient.get('/accountant/patients', { params }).then((res) => res.data);

// ─────────────────────────────────────────────────────────────
// INVOICE PAYMENT — Simplified (REQ-1, REQ-3, REQ-12)
// No review queue. No approval workflow. Full payment only.
// ─────────────────────────────────────────────────────────────

export const getUnpaidInvoices = (params = {}) =>
  apiClient.get('/accountant/invoices/unpaid', { params }).then(r => r.data);

export const getAllInvoices = (params = {}) =>
  apiClient.get('/accountant/invoices/all', { params }).then(r => r.data);

export const getDebtList = () =>
  apiClient.get('/accountant/invoices/debts').then(r => r.data.data ?? []);

export const getInvoiceDetail = (id) =>
  apiClient.get(`/accountant/invoices/${id}/detail`).then(r => r.data.data);

export const recordFullPayment = (invoiceId, data) =>
  apiClient.post(`/accountant/invoices/${invoiceId}/payments`, data).then(r => r.data);

export const flagEmergencyDebt = (invoiceId) =>
  apiClient.post(`/accountant/invoices/${invoiceId}/flag-debt`).then(r => r.data);
