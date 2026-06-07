import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Eye, Upload,
} from 'lucide-react';
import {
  getInvoices, getInvoice, createInvoice, recordPayment,
  getClaims, createClaim, updateClaimStatus, uploadClaimDocument,
  getTaxes, payTax, getFilters, getAccountantPatients,
} from '../../services/accountantService';

// ── Status colour maps ────────────────────────────────────────
const statusColors = {
  paid:      'bg-green-100 text-green-700',
  partial:   'bg-amber-100 text-amber-700',
  sent:      'bg-blue-100 text-blue-700',
  overdue:   'bg-red-100 text-red-700',
  draft:     'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};
const claimStatusColors = {
  draft:     'bg-gray-100 text-gray-500',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  paid:      'bg-purple-100 text-purple-700',
};
const taxStatusColors = {
  pending: 'bg-amber-100 text-amber-700',
  paid:    'bg-green-100 text-green-700',
};
const formatCurrency = (v) => `ETB ${Number(v || 0).toLocaleString()}`;

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>{msg}</div>
  );
}

// ── Invoice create modal ──────────────────────────────────────
function InvoiceModal({ onClose, onSave, patients, branches, saving }) {
  const [form, setForm] = useState({
    patient_id: '', branch_id: '', due_date: '', tax_rate: 15,
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  });

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => {
    const items = [...form.items];
    items[i][field] = field === 'quantity' || field === 'unit_price' ? parseFloat(val) || 0 : val;
    setForm(f => ({ ...f, items }));
  };

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tax      = subtotal * (form.tax_rate / 100);
  const total    = subtotal + tax;

  const handleSubmit = () => {
    if (!form.patient_id || !form.branch_id || !form.due_date || !form.items.length) return;
    onSave({ ...form, items: form.items.filter(i => i.description && i.quantity > 0) });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Create Invoice</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient</label>
              <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name || `${p.first_name} ${p.last_name}`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
              <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Rate (%)</label>
              <input type="number" value={form.tax_rate}
                onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Items</label>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input placeholder="Description" value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                  <input type="number" placeholder="Qty" value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                  <input type="number" placeholder="Price" value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem}
              className="mt-2 text-sm text-blue-600 font-semibold hover:text-blue-800">+ Add Item</button>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal:</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax ({form.tax_rate}%):</span><span className="font-semibold">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-base font-bold pt-1"><span>Total:</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payment modal ─────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    amount: invoice?.balance_due ?? '',
    payment_method: 'cash',
    reference: '',
  });
  const [err, setErr] = useState('');

  const handleSubmit = () => {
    setErr('');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setErr('Enter a valid amount.'); return; }
    if (amt > invoice.balance_due) { setErr(`Amount exceeds balance of ${formatCurrency(invoice.balance_due)}.`); return; }
    onSave({ ...form, amount: amt });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{err}</div>}

          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice</span>
              <span className="font-semibold">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Patient</span>
              <span className="font-semibold">{invoice.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-bold text-amber-600">{formatCurrency(invoice.balance_due)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount <span className="text-red-500">*</span>
              <span className="ml-1 text-xs text-gray-400">(max {formatCurrency(invoice.balance_due)})</span>
            </label>
            <input type="number" step="0.01" min="0.01" max={invoice.balance_due}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
              placeholder="Enter amount" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
            <select value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
              <option value="cash">Cash</option>
              <option value="telebirr">Telebirr</option>
              <option value="chapa">Chapa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference (Optional)</label>
            <input value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="Transaction ID / Reference"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Processing...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice detail drawer ─────────────────────────────────────
function InvoiceDetailDrawer({ invoice, onClose, onRecordPayment }) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl border-l border-gray-100 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Invoice Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="text-center pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-400">INVOICE</p>
          <p className="text-lg font-bold text-gray-900">{invoice?.invoice_number}</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[invoice?.status]}`}>
            {invoice?.status?.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2">
          {[
            ['Patient',    invoice?.patient_name],
            ['Branch',     invoice?.branch_name],
            ['Issued',     invoice?.issued_at],
            ['Due Date',   invoice?.due_date],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value || '—'}</span>
            </div>
          ))}
        </div>

        {invoice?.items?.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm font-semibold text-gray-900 mb-2">Items</p>
            <div className="space-y-2">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <p className="text-gray-700">{item.description}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-1">
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span><span>{formatCurrency(invoice?.total)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span>Paid</span><span>{formatCurrency(invoice?.paid_amount)}</span>
          </div>
          <div className="flex justify-between text-sm text-amber-600 font-semibold">
            <span>Balance Due</span><span>{formatCurrency(invoice?.balance_due)}</span>
          </div>
        </div>

        {invoice?.payments?.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm font-semibold text-gray-900 mb-2">Payment History</p>
            <div className="space-y-2">
              {invoice.payments.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-semibold text-gray-700 capitalize">{p.method}</span>
                    {p.reference && <span className="ml-1 text-gray-400">· {p.reference}</span>}
                    <div className="text-gray-400">{p.paid_at}</div>
                  </div>
                  <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Record Payment button shown when balance > 0 ── */}
        {invoice?.balance_due > 0 && invoice?.status !== 'paid' && (
          <button onClick={() => onRecordPayment(invoice)}
            className="w-full mt-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
            Record Payment
          </button>
        )}
      </div>
    </div>
  );
}

// ── Claim modal ───────────────────────────────────────────────
function ClaimModal({ onClose, onSave, patients, invoices, saving }) {
  const [form, setForm] = useState({
    patient_id: '', invoice_id: '', insurance_provider: '', claim_amount: '', notes: '',
  });
  const handleSubmit = () => {
    if (!form.patient_id || !form.insurance_provider || !form.claim_amount) return;
    onSave(form);
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">New Insurance Claim</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Patient', key: 'patient_id', type: 'select',
              options: patients.map(p => ({ value: p.id, label: p.name || `${p.first_name} ${p.last_name}` })) },
          ].map(({ label, key, type, options }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                <option value="">Select patient</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Related Invoice (Optional)</label>
            <select value={form.invoice_id} onChange={e => setForm(f => ({ ...f, invoice_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
              <option value="">None</option>
              {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.patient_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Provider</label>
            <input value={form.insurance_provider} placeholder="e.g. Ethio Life Care"
              onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Claim Amount (ETB)</label>
            <input type="number" value={form.claim_amount}
              onChange={e => setForm(f => ({ ...f, claim_amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AccountantBilling() {
  const [activeTab,   setActiveTab]   = useState('invoices');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [toast,       setToast]       = useState(null);
  const [pagination,  setPagination]  = useState({ current_page: 1, last_page: 1, total: 0 });

  const [invoices,           setInvoices]           = useState([]);
  const [selectedInvoice,    setSelectedInvoice]    = useState(null);
  // drawer shows full detail (items + payments); payment modal records a new payment
  const [showDetailDrawer,   setShowDetailDrawer]   = useState(false);
  const [showInvoiceModal,   setShowInvoiceModal]   = useState(false);
  const [showPaymentModal,   setShowPaymentModal]   = useState(false);
  // invoiceForPayment holds the invoice being paid — may come from drawer or table row
  const [invoiceForPayment,  setInvoiceForPayment]  = useState(null);

  const [claims,             setClaims]             = useState([]);
  const [showClaimModal,     setShowClaimModal]     = useState(false);
  const [updatingClaimStatus,setUpdatingClaimStatus]= useState(null);
  const [uploadingClaim,     setUploadingClaim]     = useState(null);

  const [taxes,              setTaxes]              = useState([]);
  const [payingTax,          setPayingTax]          = useState(null);

  const [patients,           setPatients]           = useState([]);
  const [branches,           setBranches]           = useState([]);

  const showMsg = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  useEffect(() => {
  getFilters()
    .then(data => setBranches(data.branches || []))
    .catch(() => {});

  getAccountantPatients({ per_page: 200 })
    .then(res => setPatients(res.data || []))
    .catch(() => {});
}, []);
  // // Patients for dropdowns — uses accountant/patients endpoint
  // useEffect(() => {
  //   import('../../../services/axiosInstance').then(({ default: api }) => {
  //     api.get('/accountant/patients?per_page=200').then(res => {
  //       if (res.data.success) setPatients(res.data.data || []);
  //     }).catch(() => {});
  //   });
  // }, []);

  // ── Load invoices ───────────────────────────────────────────
  const loadInvoices = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page, per_page: 15,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
      };
      const res = await getInvoices(params);
      setInvoices(res.data || []);
      setPagination({
        current_page: res.meta?.current_page || 1,
        last_page:    res.meta?.last_page    || 1,
        total:        res.meta?.total        || 0,
      });
    } catch { showMsg('Failed to load invoices', 'error'); }
    finally  { setLoading(false); }
  }, [statusFilter, search, showMsg]);

  const loadClaims = useCallback(async () => {
    try { const res = await getClaims(); setClaims(res.data || []); }
    catch { showMsg('Failed to load claims', 'error'); }
  }, [showMsg]);

  const loadTaxes = useCallback(async () => {
    try { const data = await getTaxes({ status: 'all' }); setTaxes(data || []); }
    catch { showMsg('Failed to load taxes', 'error'); }
  }, [showMsg]);

  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'claims')   loadClaims();
    if (activeTab === 'taxes')    loadTaxes();
  }, [activeTab, loadInvoices, loadClaims, loadTaxes]);

  // ── Open drawer — fetches full invoice detail (items + payments) ──
  const openDetailDrawer = async (inv) => {
    setSelectedInvoice(inv);   // show immediately with list data
    setShowDetailDrawer(true);
    try {
      const full = await getInvoice(inv.id);
      setSelectedInvoice(full);
    } catch { /* keep summary data */ }
  };

  // ── Open payment modal — called from drawer OR directly from table ──
  const openPaymentModal = (inv) => {
    setInvoiceForPayment(inv);
    setShowDetailDrawer(false);   // close drawer so modals don't stack
    setShowPaymentModal(true);
  };

  // ── Handlers ────────────────────────────────────────────────
  const handleCreateInvoice = async (data) => {
    setSaving(true);
    try {
      await createInvoice(data);
      showMsg('Invoice created successfully');
      setShowInvoiceModal(false);
      loadInvoices();
    } catch (err) { showMsg(err?.response?.data?.message || 'Failed to create invoice', 'error'); }
    finally { setSaving(false); }
  };

  const handleRecordPayment = async (payData) => {
    if (!invoiceForPayment) return;
    setSaving(true);
    try {
      await recordPayment(invoiceForPayment.id, payData);
      showMsg('Payment recorded successfully');
      setShowPaymentModal(false);
      setInvoiceForPayment(null);
      loadInvoices();
    } catch (err) { showMsg(err?.response?.data?.message || 'Failed to record payment', 'error'); }
    finally { setSaving(false); }
  };

  const handleCreateClaim = async (data) => {
    setSaving(true);
    try {
      await createClaim(data);
      showMsg('Claim created successfully');
      setShowClaimModal(false);
      loadClaims();
    } catch { showMsg('Failed to create claim', 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdateClaimStatus = async (claimId, status) => {
    setUpdatingClaimStatus(claimId);
    try {
      await updateClaimStatus(claimId, status);
      showMsg(`Claim updated to ${status}`);
      loadClaims();
    } catch { showMsg('Failed to update claim', 'error'); }
    finally { setUpdatingClaimStatus(null); }
  };

  const handleUploadDoc = async (claimId, file) => {
    setUploadingClaim(claimId);
    try {
      await uploadClaimDocument(claimId, file);
      showMsg('Document uploaded');
    } catch { showMsg('Upload failed', 'error'); }
    finally { setUploadingClaim(null); }
  };

  const handlePayTax = async (taxId) => {
    setPayingTax(taxId);
    try {
      await payTax(taxId);
      showMsg('Tax payment recorded');
      loadTaxes();
    } catch { showMsg('Failed to record tax payment', 'error'); }
    finally { setPayingTax(null); }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showInvoiceModal && (
        <InvoiceModal onClose={() => setShowInvoiceModal(false)}
          onSave={handleCreateInvoice} patients={patients} branches={branches} saving={saving} />
      )}

      {/* Payment modal — triggered from drawer or table */}
      {showPaymentModal && invoiceForPayment && (
        <PaymentModal
          invoice={invoiceForPayment}
          onClose={() => { setShowPaymentModal(false); setInvoiceForPayment(null); }}
          onSave={handleRecordPayment}
          saving={saving}
        />
      )}

      {/* Detail drawer — "Record Payment" inside it opens the payment modal */}
      {showDetailDrawer && selectedInvoice && (
        <InvoiceDetailDrawer
          invoice={selectedInvoice}
          onClose={() => { setShowDetailDrawer(false); setSelectedInvoice(null); }}
          onRecordPayment={openPaymentModal}
        />
      )}

      {showClaimModal && (
        <ClaimModal onClose={() => setShowClaimModal(false)}
          onSave={handleCreateClaim} patients={patients} invoices={invoices} saving={saving} />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Billing Management</p>
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage invoices, insurance claims, and tax obligations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['invoices', 'claims', 'taxes'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── INVOICES ── */}
      {activeTab === 'invoices' && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-w-md">
              <Search className="w-4 h-4 text-gray-400" />
              <input placeholder="Search invoices..." value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadInvoices()}
                className="flex-1 text-sm outline-none bg-transparent" />
            </div>
            <div className="flex gap-2">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 outline-none">
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <button onClick={() => setShowInvoiceModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900">
                <Plus className="w-4 h-4" /> New Invoice
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['INVOICE', 'PATIENT', 'TOTAL', 'BALANCE', 'STATUS', 'DUE DATE', 'ACTIONS'].map(h => (
                    <th key={h} className={`px-6 py-3 text-xs font-bold tracking-widest text-gray-400 ${
                      ['TOTAL','BALANCE'].includes(h) ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No invoices found</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-medium">{inv.patient_name}</td>
                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(inv.total)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-amber-600">{formatCurrency(inv.balance_due)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{inv.due_date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* View detail */}
                        <button onClick={() => openDetailDrawer(inv)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 transition-colors" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Record payment — shown directly in table when balance > 0 */}
                        {inv.status !== 'paid' && inv.balance_due > 0 && (
                          <button onClick={() => openPaymentModal(inv)}
                            className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors">
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.last_page > 1 && (
              <div className="flex justify-center gap-2 px-6 py-4 border-t border-gray-100">
                {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => loadInvoices(p)}
                    className={`w-8 h-8 rounded-lg text-sm ${
                      pagination.current_page === p ? 'bg-[#1F4E79] text-white' : 'hover:bg-gray-100'
                    }`}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CLAIMS ── */}
      {activeTab === 'claims' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowClaimModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900">
              + New Claim
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['PATIENT','PROVIDER','AMOUNT','STATUS','ACTIONS'].map(h => (
                    <th key={h} className={`px-6 py-3 text-xs font-bold tracking-widest text-gray-400 ${
                      h === 'AMOUNT' ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No claims found</td></tr>
                ) : claims.map(claim => (
                  <tr key={claim.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{claim.patient_name}</td>
                    <td className="px-6 py-4 text-gray-600">{claim.insurance_provider}</td>
                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(claim.claim_amount)}</td>
                    <td className="px-6 py-4">
                      <select value={claim.status}
                        onChange={e => handleUpdateClaimStatus(claim.id, e.target.value)}
                        disabled={updatingClaimStatus === claim.id}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${claimStatusColors[claim.status]}`}>
                        {['draft','submitted','approved','rejected','paid'].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-blue-600 inline-flex">
                        <Upload className="w-4 h-4" />
                        <input type="file" className="hidden"
                          onChange={e => e.target.files?.[0] && handleUploadDoc(claim.id, e.target.files[0])} />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAXES ── */}
      {activeTab === 'taxes' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['TAX NAME','RATE','AMOUNT','DUE DATE','STATUS','ACTION'].map(h => (
                  <th key={h} className={`px-6 py-3 text-xs font-bold tracking-widest text-gray-400 ${
                    ['RATE','AMOUNT'].includes(h) ? 'text-right' : 'text-left'
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {taxes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No taxes found</td></tr>
              ) : taxes.map(tax => (
                <tr key={tax.id} className="border-b border-gray-50">
                  <td className="px-6 py-4 font-medium">{tax.name}</td>
                  <td className="px-6 py-4 text-right">{tax.rate}%</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(tax.amount)}</td>
                  <td className="px-6 py-4 text-gray-500">{tax.due_date}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${taxStatusColors[tax.status]}`}>
                      {tax.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tax.status === 'pending' && (
                      <button onClick={() => handlePayTax(tax.id)} disabled={payingTax === tax.id}
                        className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-50">
                        {payingTax === tax.id ? '...' : 'Pay Now'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}