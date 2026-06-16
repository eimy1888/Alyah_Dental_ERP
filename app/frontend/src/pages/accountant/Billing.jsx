import { useState, useEffect, useCallback } from 'react';
import {
  Search, X, Eye, AlertTriangle, Loader2,
  CheckCircle2, CreditCard, Lock, RefreshCw,
} from 'lucide-react';
import {
  getUnpaidInvoices, getAllInvoices, getDebtList,
  getInvoiceDetail, recordFullPayment, flagEmergencyDebt,
  getFilters, getAccountantPatients,
  getInvoices, createInvoice,
  getClaims, createClaim, updateClaimStatus, uploadClaimDocument,
  getTaxes, payTax,
} from '../../services/accountantService';

// ── Helpers ───────────────────────────────────────────────────
const fmt = (v) => `ETB ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const lifecycleBadge = {
  unpaid:  'bg-red-100 text-red-700',
  paid:    'bg-green-100 text-green-700',
  locked:  'bg-gray-200 text-gray-600',
};

const typeBadge = {
  treatment:  'bg-violet-100 text-violet-700',
  card:       'bg-blue-100 text-blue-700',
  diagnostic: 'bg-amber-100 text-amber-700',
  service:    'bg-cyan-100 text-cyan-700',
};

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white max-w-sm ${
      type === 'error' ? 'bg-red-500' : 'bg-green-600'
    }`}>{msg}</div>
  );
}

// ── Payment Modal ─────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSaved, saving }) {
  const [method, setMethod] = useState('cash');
  const [ref, setRef]       = useState('');
  const [err, setErr]       = useState('');
  const balance = (float) => parseFloat(invoice?.balance ?? 0);

  const handlePay = () => {
    setErr('');
    if (!method) { setErr('Select a payment method.'); return; }
    onSaved({ amount: invoice.balance, payment_method: method, reference: ref });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Record Full Payment</h3>
            <p className="text-xs text-gray-400 mt-0.5">{invoice?.invoice_number}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="px-4 py-2.5 rounded-xl bg-red-50 text-sm text-red-600">{err}</div>}

          <div className="bg-amber-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Patient</span><span className="font-bold">{invoice?.patient_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span className="font-mono text-xs">{invoice?.invoice_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBadge[invoice?.invoice_type] ?? 'bg-gray-100 text-gray-600'}`}>
                {invoice?.invoice_type}
              </span>
            </div>
            {invoice?.is_emergency && (
              <div className="flex items-center gap-1 text-red-600 font-bold text-xs"><AlertTriangle className="w-3 h-3" /> EMERGENCY</div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-amber-200">
              <span>Amount Due</span><span className="text-red-700">{fmt(invoice?.balance)}</span>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-blue-50 text-xs text-blue-700 font-semibold">
            Full payment only — partial payments are not accepted.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400">
              <option value="cash">Cash</option>
              <option value="telebirr">Telebirr</option>
              <option value="chapa">Chapa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference (Optional)</label>
            <input value={ref} onChange={e => setRef(e.target.value)}
              placeholder="Transaction ID / Receipt number"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={handlePay} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Processing…' : `Confirm Payment — ${fmt(invoice?.balance)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Detail Drawer ──────────────────────────────────────
function InvoiceDrawer({ invoice, onClose, onPay, onFlagDebt }) {
  if (!invoice) return null;
  const isUnpaid = invoice.lifecycle_status === 'unpaid';
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl border-l border-gray-100 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{invoice.invoice_number}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{invoice.patient?.full_name}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5 space-y-4">
        {/* Status banner */}
        {isUnpaid && (
          <div className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 ${
            invoice.is_emergency ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {invoice.is_emergency ? '🚨 EMERGENCY — ' : ''}PAYMENT REQUIRED — {fmt(invoice.balance)}
          </div>
        )}
        {invoice.lifecycle_status === 'paid' && (
          <div className="px-4 py-3 rounded-xl bg-green-50 text-green-700 border border-green-200 font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> PAID — Treatment Active
          </div>
        )}
        {invoice.lifecycle_status === 'locked' && (
          <div className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 border border-gray-200 font-bold text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" /> LOCKED — Audit Record
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 text-sm">
          {[
            ['Patient',   invoice.patient?.full_name],
            ['Dentist',   invoice.dentist],
            ['Type',      invoice.invoice_type],
            ['Issued',    invoice.issued_at],
            ['Total',     fmt(invoice.total)],
            ['Paid',      fmt(invoice.paid)],
            ['Balance',   fmt(invoice.balance)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-900">{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Items */}
        {invoice.items?.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Line Items</p>
            {invoice.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.description}</span>
                <span className="font-semibold">{fmt(item.total)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
              <span>VAT ({invoice.tax_rate}%)</span><span>{fmt(invoice.tax_amount)}</span>
            </div>
          </div>
        )}

        {/* Payments */}
        {invoice.payments?.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payments</p>
            {invoice.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="font-semibold capitalize">{p.method}</span>
                <span className="text-green-600 font-bold">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {isUnpaid && (
          <div className="space-y-2 pt-2">
            <button onClick={() => onPay(invoice)}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" /> Record Full Payment — {fmt(invoice.balance)}
            </button>
            {invoice.is_emergency && (
              <button onClick={() => onFlagDebt(invoice)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Flag as Debt (Patient Leaving Without Paying)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AccountantBilling() {
  const [activeTab,   setActiveTab]   = useState('unpaid');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [toast,       setToast]       = useState(null);
  const [pagination,  setPagination]  = useState({ current_page: 1, last_page: 1, total: 0 });

  const [invoices,       setInvoices]       = useState([]);
  const [debts,          setDebts]          = useState([]);
  const [selectedInvoice,setSelectedInvoice]= useState(null);
  const [drawerInvoice,  setDrawerInvoice]  = useState(null);
  const [showPayModal,   setShowPayModal]   = useState(false);
  const [invoiceForPay,  setInvoiceForPay]  = useState(null);

  const showMsg = (msg, type = 'success') => setToast({ msg, type });

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page, per_page: 20,
        ...(typeFilter !== 'all' && { invoice_type: typeFilter }),
        ...(search && { search }),
      };

      if (activeTab === 'unpaid') {
        const res = await getUnpaidInvoices(params);
        setInvoices(res.data || []);
        setPagination({ current_page: res.meta?.current_page || 1, last_page: res.meta?.last_page || 1, total: res.meta?.total || 0 });
      } else if (activeTab === 'debts') {
        const data = await getDebtList();
        setDebts(data || []);
      } else {
        const statusParam = activeTab === 'paid' ? 'paid' : activeTab === 'locked' ? 'locked' : undefined;
        const res = await getAllInvoices({ ...params, ...(statusParam && { lifecycle_status: statusParam }) });
        setInvoices(res.data || []);
        setPagination({ current_page: res.meta?.current_page || 1, last_page: res.meta?.last_page || 1, total: res.meta?.total || 0 });
      }
    } catch { showMsg('Failed to load invoices', 'error'); }
    finally { setLoading(false); }
  }, [activeTab, typeFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDrawer = async (inv) => {
    setDrawerInvoice(inv);
    try {
      const detail = await getInvoiceDetail(inv.id);
      setDrawerInvoice(detail);
    } catch {}
  };

  const openPayModal = (inv) => {
    setInvoiceForPay(inv);
    setDrawerInvoice(null);
    setShowPayModal(true);
  };

  const handleRecordPayment = async (payData) => {
    if (!invoiceForPay) return;
    setSaving(true);
    try {
      await recordFullPayment(invoiceForPay.id, payData);
      showMsg(`Payment of ${fmt(payData.amount)} recorded. Treatment activated!`);
      setShowPayModal(false);
      setInvoiceForPay(null);
      loadData();
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Payment failed.', 'error');
    } finally { setSaving(false); }
  };

  const handleFlagDebt = async (inv) => {
    try {
      await flagEmergencyDebt(inv.id);
      showMsg(`Patient flagged with outstanding debt of ${fmt(inv.balance)}.`);
      setDrawerInvoice(null);
      loadData();
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Failed to flag debt.', 'error');
    }
  };

  const tabs = [
    { key: 'unpaid', label: 'Unpaid', color: 'text-red-600' },
    { key: 'paid',   label: 'Paid',   color: 'text-green-600' },
    { key: 'locked', label: 'Locked', color: 'text-gray-600' },
    { key: 'debts',  label: 'Debts',  color: 'text-orange-600' },
    { key: 'all',    label: 'All',    color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showPayModal && invoiceForPay && (
        <PaymentModal
          invoice={invoiceForPay}
          onClose={() => { setShowPayModal(false); setInvoiceForPay(null); }}
          onSaved={handleRecordPayment}
          saving={saving}
        />
      )}

      {drawerInvoice && (
        <InvoiceDrawer
          invoice={drawerInvoice}
          onClose={() => setDrawerInvoice(null)}
          onPay={openPayModal}
          onFlagDebt={handleFlagDebt}
        />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Accountant</p>
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Collect payments. No approval workflow required.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? `${tab.color} border-b-2 border-current`
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
        <button onClick={() => loadData()}
          className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 mb-1">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search + filter */}
      {activeTab !== 'debts' && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patient name…"
              className="flex-1 text-sm outline-none bg-transparent" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none">
            <option value="all">All Types</option>
            <option value="treatment">Treatment</option>
            <option value="card">Clinic Card</option>
            <option value="diagnostic">Diagnostic</option>
            <option value="service">Service</option>
          </select>
        </div>
      )}

      {/* ── DEBTS TAB ── */}
      {activeTab === 'debts' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-red-700">Patients with Outstanding Debt</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : debts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No outstanding debts.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {debts.map(patient => (
                <div key={patient.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{patient.full_name}</p>
                    <p className="text-xs text-gray-400">{patient.phone} · Flagged {patient.debt_flagged_at}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{fmt(patient.debt_amount)}</p>
                    <button onClick={() => openDrawer({ id: patient.debt_invoice_id })}
                      className="text-xs text-blue-600 hover:underline mt-0.5">View Invoice</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INVOICE TABLE (unpaid / paid / locked / all) ── */}
      {activeTab !== 'debts' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No invoices found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['INVOICE', 'PATIENT', 'TYPE', 'AMOUNT', 'STATUS', 'ACTIONS'].map(h => (
                        <th key={h} className={`px-5 py-3 text-xs font-bold tracking-widest text-gray-400 ${
                          h === 'AMOUNT' ? 'text-right' : 'text-left'
                        }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoices.map(inv => (
                      <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${inv.is_emergency ? 'bg-red-50/30' : ''}`}>
                        <td className="px-5 py-3.5">
                          <p className="font-mono text-xs font-bold text-gray-800">{inv.invoice_number}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{inv.issued_at}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900">{inv.patient_name}</p>
                          {inv.patient_has_debt && (
                            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> HAS DEBT
                            </span>
                          )}
                          {inv.is_emergency && (
                            <span className="text-[10px] font-bold text-red-500">🚨 EMERGENCY</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${typeBadge[inv.invoice_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {inv.invoice_type}
                          </span>
                          {inv.dentist_name && inv.dentist_name !== '—' && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Dr. {inv.dentist_name}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <p className="font-bold text-gray-900">{fmt(inv.total)}</p>
                          {(float => float > 0)(parseFloat(inv.balance)) && (
                            <p className="text-xs text-red-600 font-semibold">Due: {fmt(inv.balance)}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lifecycleBadge[inv.lifecycle_status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {inv.lifecycle_status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {inv.lifecycle_status === 'unpaid' && (
                              <button onClick={() => openPayModal(inv)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
                                <CreditCard className="w-3 h-3" /> Pay
                              </button>
                            )}
                            <button onClick={() => openDrawer(inv)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.last_page > 1 && (
                <div className="flex justify-center gap-2 px-6 py-4 border-t border-gray-100">
                  {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => loadData(p)}
                      className={`w-8 h-8 rounded-lg text-sm ${pagination.current_page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
