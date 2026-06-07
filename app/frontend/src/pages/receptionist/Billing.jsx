import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CreditCard, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { getInvoices, createInvoice, recordPayment, getPatients } from '../../services/receptionistService';
import { StatusBadge, SkeletonTable, PageHeader, EmptyState, ConfirmDialog, SectionCard } from '../../components/ui/DashCard';
import { useToast } from '../../components/ui/Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `ETB ${Number(n || 0).toLocaleString()}`;

// ── Modal backdrop wrapper ─────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Billing() {
  const { success, error: toastError, warning } = useToast();

  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pagination,  setPagination]  = useState({ total: 0, current_page: 1, last_page: 1 });
  const [page,        setPage]        = useState(1);

  // Modals
  const [showCreate,  setShowCreate]  = useState(false);
  const [showPay,     setShowPay]     = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);

  // Confirm cancel dialog
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Create form
  const [patients,           setPatients]           = useState([]);
  const [patientSearch,      setPatientSearch]      = useState('');
  const [showPatientDrop,    setShowPatientDrop]    = useState(false);
  const [submitting,         setSubmitting]         = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    items:      [{ description: '', quantity: 1, unit_price: 0 }],
    due_date:   '',
  });

  // Pay form
  const [payData, setPayData] = useState({ amount: '', payment_method: 'cash', reference: '' });

  // PDF loading state
  const [printingId, setPrintingId] = useState(null);

  // ── Load invoices ───────────────────────────────────────────────────────────
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await getInvoices({ page, per_page: 15 });
      setInvoices(res.data || []);
      setPagination({
        total:        res.meta?.total        || 0,
        current_page: res.meta?.current_page || 1,
        last_page:    res.meta?.last_page    || 1,
      });
    } catch {
      toastError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, [page]);

  // ── Patient search ──────────────────────────────────────────────────────────
  const handlePatientSearch = async () => {
    if (!patientSearch.trim()) return;
    try {
      const res = await getPatients({ search: patientSearch, per_page: 8 });
      setPatients(res.data || []);
      setShowPatientDrop(true);
    } catch {}
  };

  // ── Create invoice ──────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) { toastError('Please select a patient.'); return; }
    if (!formData.items.length) { toastError('Add at least one item.'); return; }

    setSubmitting(true);
    try {
      await createInvoice(formData);
      success('Invoice created successfully.');
      setShowCreate(false);
      setFormData({ patient_id: '', items: [{ description: '', quantity: 1, unit_price: 0 }], due_date: '' });
      setPatientSearch('');
      loadInvoices();
    } catch (err) {
      toastError(err?.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const addItem    = () => setFormData(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItem = (i) => setFormData(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setFormData(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [field]: val };
    return { ...f, items };
  });

  const calcTotal = () => {
    const sub = formData.items.reduce((s, item) => s + (Number(item.quantity) * Number(item.unit_price)), 0);
    return sub * 1.15;
  };

  // ── Record payment ──────────────────────────────────────────────────────────
  const handlePayment = async (e) => {
    e.preventDefault();
    const amt = Number(payData.amount);
    if (!amt || amt <= 0)            { toastError('Enter a valid amount.');                                    return; }
    if (amt > selectedInv?.balance)  { toastError(`Max payable: ${fmt(selectedInv?.balance)}`);               return; }

    setSubmitting(true);
    try {
      await recordPayment(selectedInv.id, {
        amount:         amt,
        payment_method: payData.payment_method,
        reference:      payData.reference || undefined,
      });
      success('Payment recorded.' + (selectedInv.isCardInvoice ? ' Clinic card activated.' : ''));
      setShowPay(false);
      setSelectedInv(null);
      setPayData({ amount: '', payment_method: 'cash', reference: '' });
      loadInvoices();
    } catch (err) {
      toastError(err?.response?.data?.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Print / PDF ─────────────────────────────────────────────────────────────
  const handlePrint = async (inv) => {
    setPrintingId(inv.id);
    try {
      // Opens the HTML invoice in a new tab — user can Ctrl+P to print / save as PDF
      const url = `/api/v1/receptionist/invoices/${inv.id}/pdf`;
      const win = window.open(url, '_blank');
      if (!win) {
        warning('Pop-up blocked. Please allow pop-ups for this site.');
      }
    } finally {
      setPrintingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">

      {/* Page header */}
      <PageHeader
        eyebrow="Finance"
        title="Billing"
        subtitle={`${pagination.total} invoice${pagination.total !== 1 ? 's' : ''} total`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-md hover:opacity-90 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        }
      />

      {/* Invoices table */}
      <SectionCard title="Invoices" subtitle="All invoices for this branch">
        {loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : invoices.length === 0 ? (
          <EmptyState type="invoices" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    {['Invoice #', 'Patient', 'Type', 'Total', 'Balance', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black tracking-[0.14em] text-gray-400 uppercase whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50/60 transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-mono text-[12px] text-gray-500">
                        {inv.invoice_number}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        {inv.patient?.full_name || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {inv.invoice_type || 'service'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-900">{fmt(inv.amount || inv.total)}</td>
                      <td className="px-5 py-3.5 font-semibold text-amber-600">{fmt(inv.balance)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.lifecycle_status || inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-[12px]">{inv.issued_at}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {/* Pay button */}
                          {inv.status !== 'paid' && (
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => { setSelectedInv(inv); setShowPay(true); }}
                              title="Record payment"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                            </motion.button>
                          )}
                          {/* Print / PDF */}
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => handlePrint(inv)}
                            disabled={printingId === inv.id}
                            title="Print invoice"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            {printingId === inv.id
                              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                              : <Printer className="w-4 h-4" />
                            }
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-[12px] text-gray-400">
                  Page {pagination.current_page} of {pagination.last_page}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition ${
                        pagination.current_page === p
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                    disabled={page === pagination.last_page}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Create Invoice Modal ───────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-[15px] font-black text-gray-900">Create Invoice</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Manual service invoice (15% VAT included)</p>
            </div>
            <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Patient search */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
                Patient *
              </label>
              <div className="relative flex gap-2">
                <input
                  type="text"
                  placeholder="Type patient name…"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  onFocus={() => patients.length > 0 && setShowPatientDrop(true)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handlePatientSearch())}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={handlePatientSearch}
                  className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 text-[12px] font-semibold hover:bg-blue-100 transition-colors"
                >
                  Search
                </button>
              </div>
              {showPatientDrop && patients.length > 0 && (
                <div className="mt-1 border border-gray-100 rounded-xl shadow-lg overflow-hidden bg-white z-10">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormData(f => ({ ...f, patient_id: p.id }));
                        setPatientSearch(`${p.first_name} ${p.last_name}`);
                        setShowPatientDrop(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 text-[13px]"
                    >
                      <span className="font-semibold text-gray-900">{p.first_name} {p.last_name}</span>
                      <span className="text-gray-400 ml-2 text-[12px]">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-2">
                Line Items *
              </label>
              <div className="space-y-2">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400"
                    />
                    <input
                      type="number" placeholder="Qty" min="0.01" step="0.01"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      className="w-16 px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 text-center"
                    />
                    <input
                      type="number" placeholder="Price" min="0"
                      value={item.unit_price}
                      onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                      className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={formData.items.length === 1}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                + Add item
              </button>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400"
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-[13px] font-semibold text-blue-800">Total (incl. 15% VAT)</span>
              <span className="text-[16px] font-black text-blue-700">{fmt(calcTotal())}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ── Record Payment Modal ───────────────────────────────────────────── */}
      <Modal open={showPay} onClose={() => { setShowPay(false); setSelectedInv(null); }}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-[15px] font-black text-gray-900">Record Payment</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{selectedInv?.invoice_number}</p>
            </div>
            <button onClick={() => { setShowPay(false); setSelectedInv(null); }} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handlePayment} className="p-6 space-y-5">
            {/* Balance display */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[12px] font-semibold text-amber-800">Outstanding Balance</span>
              <span className="text-[16px] font-black text-amber-700">{fmt(selectedInv?.balance)}</span>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
                Amount *
              </label>
              <input
                type="number" step="0.01" min="0.01"
                max={selectedInv?.balance}
                value={payData.amount}
                onChange={e => setPayData(d => ({ ...d, amount: e.target.value }))}
                placeholder="Enter amount…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Method */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash',          label: 'Cash' },
                  { value: 'telebirr',      label: 'Telebirr' },
                  { value: 'bank_transfer', label: 'Bank' },
                ].map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayData(d => ({ ...d, payment_method: m.value }))}
                    className={`py-2.5 rounded-xl text-[12px] font-semibold border transition-all ${
                      payData.payment_method === m.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
                Reference <span className="text-gray-300 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={payData.reference}
                onChange={e => setPayData(d => ({ ...d, reference: e.target.value }))}
                placeholder="Transaction ID, receipt no…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowPay(false); setSelectedInv(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-[13px] font-bold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Processing…' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  );
}
