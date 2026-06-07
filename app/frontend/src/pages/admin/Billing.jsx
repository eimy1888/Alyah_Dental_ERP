import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, CreditCard, AlertCircle, CheckCircle2,
  Search, X, Plus, TrendingUp, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import apiClient from '../../services/axiosInstance';

// ── API ───────────────────────────────────────────────────────────────────────
const fetchInvoices = (params) =>
  apiClient.get('/admin/billing/invoices', { params }).then(r => r.data);

const fetchPayments = () =>
  apiClient.get('/admin/billing/payments').then(r => r.data);

const fetchWeekly = () =>
  apiClient.get('/admin/billing/weekly-collections').then(r => r.data);

const fetchPatients = () =>
  apiClient.get('/admin/patients').then(r => r.data);

const fetchBranches = () =>
  apiClient.get('/admin/branches').then(r => r.data);

const createInvoice = (data) =>
  apiClient.post('/admin/billing/invoices', data).then(r => r.data);

const recordPayment = ({ invoiceId, ...data }) =>
  apiClient.post(`/admin/billing/invoices/${invoiceId}/pay`, data).then(r => r.data);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `${Number(n || 0).toLocaleString()} ETB`;

const STATUS_STYLES = {
  paid:      'bg-green-100 text-green-700',
  partial:   'bg-amber-100 text-amber-700',
  overdue:   'bg-red-100 text-red-700',
  sent:      'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

function Badge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {loading ? '—' : value}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Create Invoice Modal ──────────────────────────────────────────────────────
function CreateInvoiceModal({ patients, branches, onClose, onSave }) {
  const [patientId, setPatientId]   = useState('');
  const [branchId,  setBranchId]    = useState('');
  const [dueDate,   setDueDate]     = useState('');
  const [notes,     setNotes]       = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '' }]);
  const [saving,  setSaving]  = useState(false);
  const [apiError, setApiError] = useState('');

  const addItem = () =>
    setItems(p => [...p, { description: '', quantity: 1, unit_price: '' }]);

  const removeItem = (i) =>
    setItems(p => p.filter((_, idx) => idx !== i));

  const setItem = (i, k, v) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const total = items.reduce((s, item) =>
    s + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);

  const handleSubmit = async () => {
    if (!patientId) { setApiError('Please select a patient.'); return; }
    if (items.some(i => !i.description.trim() || !i.unit_price)) {
      setApiError('Please fill in all line items.');
      return;
    }
    setSaving(true);
    setApiError('');
    try {
      await onSave({
        patient_id: parseInt(patientId),
        branch_id:  branchId ? parseInt(branchId) : null,
        due_date:   dueDate || null,
        notes,
        items: items.map(i => ({
          description: i.description,
          quantity:    parseInt(i.quantity),
          unit_price:  parseFloat(i.unit_price),
        })),
      });
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between sticky top-0">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">Billing</p>
            <h2 className="text-white text-xl font-bold mt-0.5">Create Invoice</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{apiError}</div>
          )}

          {/* Patient + Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Patient <span className="text-red-500">*</span>
              </label>
              <select value={patientId} onChange={e => setPatientId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Branch</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No specific branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button onClick={addItem} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="col-span-6 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                    placeholder="Qty" min="1"
                    className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)}
                    placeholder="Price"
                    className="col-span-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => removeItem(i)} disabled={items.length === 1}
                    className="col-span-1 text-red-400 hover:text-red-600 disabled:opacity-30 flex justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right text-sm font-bold text-gray-900">
              Total: {fmt(total)}
            </div>
          </div>

          {/* Due date + notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSave }) {
  const [amount,    setAmount]    = useState(invoice.balance || '');
  const [method,    setMethod]    = useState('cash');
  const [reference, setReference] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [apiError,  setApiError]  = useState('');

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setApiError('Enter a valid amount.'); return; }
    setSaving(true);
    setApiError('');
    try {
      await onSave({ invoiceId: invoice.id, amount: parseFloat(amount), method, reference });
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Payment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Record Payment</h3>
        <p className="text-sm text-gray-500 mb-5">{invoice.invoice_number} · Balance: {fmt(invoice.balance)}</p>

        {apiError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{apiError}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount (ETB)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              max={invoice.balance}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="cash">Cash</option>
              <option value="telebirr">Telebirr</option>
              <option value="chapa">Chapa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reference (optional)</label>
            <input value={reference} onChange={e => setReference(e.target.value)}
              placeholder="Transaction ID / receipt #"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Detail Panel ──────────────────────────────────────────────────────
function InvoiceDetail({ invoice, onPayment }) {
  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm p-5">
        Select an invoice to view details
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Invoice Detail</p>
          <h3 className="text-xl font-bold text-gray-900 mt-0.5">{invoice.invoice_number}</h3>
          <p className="text-sm text-gray-500">
            {invoice.patient?.first_name} {invoice.patient?.last_name}
            {invoice.branch?.name ? ` · ${invoice.branch.name}` : ''}
          </p>
        </div>
        <Badge status={invoice.status} />
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-2.5">
        {[
          { label: 'Total',       value: fmt(invoice.total) },
          { label: 'Paid',        value: fmt(invoice.paid) },
          { label: 'Balance due', value: fmt(invoice.balance), highlight: invoice.balance > 0 },
          { label: 'Issued',      value: invoice.issued_at || '—' },
          { label: 'Due date',    value: invoice.due_date  || '—' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={`font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
          </div>
        ))}
      </div>

      {invoice.status !== 'paid' && invoice.balance > 0 && (
        <button
          onClick={() => onPayment(invoice)}
          className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Record Payment
        </button>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Billing() {
  const queryClient = useQueryClient();
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [selected,      setSelected]      = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [toast,         setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: invoiceData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', search, statusFilter],
    queryFn:  () => fetchInvoices({ search, status: statusFilter }),
    staleTime: 30000,
  });

  const { data: paymentData } = useQuery({
    queryKey: ['payments'],
    queryFn:  fetchPayments,
    staleTime: 30000,
  });

  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-collections'],
    queryFn:  fetchWeekly,
    staleTime: 60000,
  });

  const { data: patientData } = useQuery({
    queryKey: ['patients'],
    queryFn:  fetchPatients,
    staleTime: 60000,
  });

  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn:  fetchBranches,
    staleTime: 60000,
  });

  const invoices = invoiceData?.data    || [];
  const summary  = invoiceData?.summary || {};
  const payments = paymentData?.data    || [];
  const weekly   = weeklyData?.data     || [];
  const patients = patientData?.data    || [];
  const branches = branchData?.data     || [];

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast(`Invoice ${res.data.invoice_number} created.`);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-collections'] });
      // Update selected invoice
      setSelected(res.data.invoice);
      showToast('Payment recorded successfully.');
    },
  });

  const FILTERS = [
    { label: 'All',     value: '' },
    { label: 'Paid',    value: 'paid' },
    { label: 'Partial', value: 'partial' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Sent',    value: 'sent' },
  ];

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm">{toast}</span>
          <button onClick={() => setToast('')}><X className="w-4 h-4 opacity-50" /></button>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal
          patients={patients}
          branches={branches}
          onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutateAsync(data)}
        />
      )}

      {paymentTarget && (
        <PaymentModal
          invoice={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSave={(data) => paymentMutation.mutateAsync(data)}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-6 py-5 border border-blue-100 flex-1 mr-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Billing Module</p>
          <h1 className="text-2xl font-extrabold text-gray-900">Invoices, payments, and collections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create invoices, record payments, and track outstanding balances.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open invoices"   value={summary.open_count}
          sub="unpaid + partial"
          icon={FileText}    iconBg="bg-blue-500"   loading={loadingInvoices} />
        <KpiCard label="Collected today" value={fmt(summary.collected_today)}
          sub="completed payments"
          icon={TrendingUp}  iconBg="bg-green-500"  loading={loadingInvoices} />
        <KpiCard label="Outstanding AR"  value={fmt(summary.outstanding_total)}
          sub={`${summary.overdue_count || 0} overdue`}
          icon={AlertCircle} iconBg="bg-amber-500"  loading={loadingInvoices} />
        <KpiCard label="Total invoices"  value={invoices.length}
          sub="all statuses"
          icon={CreditCard}  iconBg="bg-violet-500" loading={loadingInvoices} />
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice number or patient..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice register + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Invoice list */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Invoice Register</h2>
            <p className="text-xs text-gray-400">
              {loadingInvoices ? 'Loading...' : `${invoices.length} invoices`}
            </p>
          </div>

          {loadingInvoices ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {invoices.map(inv => (
                <div key={inv.id} onClick={() => setSelected(inv)}
                  className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
                    selected?.id === inv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
                      <Badge status={inv.status} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {inv.patient?.first_name} {inv.patient?.last_name}
                      {inv.branch?.name ? ` · ${inv.branch.name}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(inv.total)}</p>
                    {inv.balance > 0 && (
                      <p className="text-xs text-red-500">{fmt(inv.balance)} due</p>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No invoices found.</div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <InvoiceDetail invoice={selected} onPayment={(inv) => setPaymentTarget(inv)} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-0.5">Collections this week</h2>
          <p className="text-xs text-gray-400 mb-5">Revenue collected per day (ETB).</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={v => [`${Number(v).toLocaleString()} ETB`, 'Collections']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent payments */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Payments</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[260px] overflow-y-auto">
            {payments.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      {p.patient?.first_name} {p.patient?.last_name}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">{p.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{fmt(p.amount)}</p>
                  <p className="text-[10px] text-gray-400">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">No payments yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}