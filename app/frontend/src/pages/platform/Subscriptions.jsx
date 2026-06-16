import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, X, Save, CheckCircle2,
  Loader2, CreditCard, Shield, ShieldOff, AlertTriangle,
  RefreshCw, Search, History,
} from 'lucide-react';
import {
  getPlatformPlans, createPlan, updatePlan, deletePlan,
  getClinics, assignPlanToClinic, recordClinicPayment,
  getClinicPaymentHistory,
} from '../../services/platformService';

// ── helpers ────────────────────────────────────────────────────────────────────
const ETB = (n) => `ETB ${Number(n ?? 0).toLocaleString()}`;

const subStatusColor = {
  active:    'bg-green-50 text-green-700 border-green-200',
  expired:   'bg-red-50 text-red-700 border-red-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  suspended: 'bg-gray-100 text-gray-500 border-gray-200',
};

// ── Plan Modal (create / edit) ─────────────────────────────────────────────────
const EMPTY_PLAN = {
  name: '', type: 'paid',
  duration_days: '', duration_value: '', duration_unit: 'months',
  monthly_price: '', annual_price: '',
  max_users: '', max_branches: '', max_storage_gb: '',
  features: [''], is_active: true,
};

function PlanModal({ plan, onClose, onSave, saving }) {
  const [form, setForm] = useState(
    plan ? {
      name:           plan.name ?? '',
      type:           plan.type ?? 'paid',
      duration_days:  plan.duration_days ?? '',
      duration_value: plan.duration_value ?? '',
      duration_unit:  plan.duration_unit ?? 'months',
      monthly_price:  plan.monthly_price ?? '',
      annual_price:   plan.annual_price ?? '',
      max_users:      plan.max_users ?? '',
      max_branches:   plan.max_branches ?? '',
      max_storage_gb: plan.max_storage_gb ?? '',
      features:       Array.isArray(plan.features) && plan.features.length ? [...plan.features] : [''],
      is_active:      plan.is_active ?? true,
    } : { ...EMPTY_PLAN, features: [''] }
  );

  const isFree = form.type === 'free';

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const updateFeature = (i, val) => {
    const f = [...form.features]; f[i] = val;
    setForm((p) => ({ ...p, features: f }));
  };

  const handleSave = () => {
    const payload = {
      name: form.name, type: form.type,
      max_users: Number(form.max_users),
      max_branches: Number(form.max_branches),
      max_storage_gb: Number(form.max_storage_gb),
      features: form.features.filter((f) => f.trim() !== ''),
      is_active: form.is_active,
    };
    if (isFree) {
      payload.duration_days = Number(form.duration_days);
    } else {
      payload.duration_value = Number(form.duration_value);
      payload.duration_unit  = form.duration_unit;
      payload.monthly_price  = Number(form.monthly_price);
      payload.annual_price   = Number(form.annual_price);
    }
    onSave(payload);
  };

  const canSave = form.name &&
    form.max_users && form.max_branches && form.max_storage_gb &&
    (isFree ? form.duration_days : form.monthly_price && form.annual_price && form.duration_value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{plan ? 'Edit Plan' : 'Create Plan'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Plan name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Pro" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none focus:border-blue-400" />
          </div>

          {/* Type — only on create */}
          {!plan && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plan type</label>
              <div className="flex gap-3">
                {['free', 'paid'].map((t) => (
                  <button key={t} onClick={() => set('type', t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors capitalize
                      ${form.type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {isFree && (
                <p className="mt-1.5 text-xs text-gray-400">Free plans have no cost. Annual billing is not available.</p>
              )}
            </div>
          )}

          {/* Duration */}
          {isFree ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration (days)</label>
              <input type="number" value={form.duration_days} onChange={(e) => set('duration_days', e.target.value)}
                placeholder="30" min="1" max="3650"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration value</label>
                <input type="number" value={form.duration_value} onChange={(e) => set('duration_value', e.target.value)}
                  placeholder="1" min="1"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration unit</label>
                <select value={form.duration_unit} onChange={(e) => set('duration_unit', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          )}

          {/* Pricing — paid only */}
          {!isFree && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monthly price (ETB)</label>
                <input type="number" value={form.monthly_price} onChange={(e) => set('monthly_price', e.target.value)}
                  placeholder="499" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Annual price (ETB)</label>
                <input type="number" value={form.annual_price} onChange={(e) => set('annual_price', e.target.value)}
                  placeholder="4788" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'max_users',      label: 'Max users',    placeholder: '10' },
              { key: 'max_branches',   label: 'Max branches', placeholder: '3' },
              { key: 'max_storage_gb', label: 'Storage (GB)', placeholder: '5' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
              </div>
            ))}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2.5 px-4 border border-gray-100 rounded-xl">
            <p className="text-sm font-medium text-gray-700">Plan active</p>
            <button onClick={() => set('is_active', !form.is_active)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${form.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${form.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Features */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Features</label>
            <div className="space-y-2">
              {form.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={f} onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder={`Feature ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                  <button onClick={() => setForm((p) => ({ ...p, features: p.features.filter((_, j) => j !== i) }))}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm((p) => ({ ...p, features: [...p.features, ''] }))}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> Add feature
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !canSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save plan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Plan Modal ──────────────────────────────────────────────────────────
function AssignPlanModal({ clinic, plans, onClose, onDone }) {
  const [planId, setPlanId]         = useState('');
  const [billingCycle, setCycle]    = useState('monthly');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const selectedPlan = plans.find((p) => p.id === Number(planId));
  const isFree = selectedPlan?.type === 'free';

  const handleAssign = async () => {
    if (!planId) return;
    try {
      setSaving(true); setError('');
      await assignPlanToClinic(clinic.id, {
        plan_id: Number(planId),
        billing_cycle: isFree ? 'days' : billingCycle,
      });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to assign plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Assign Plan</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Clinic: <span className="font-semibold text-gray-900">{clinic.name}</span></p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
              <option value="">Select a plan...</option>
              {plans.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type === 'free' ? `Free · ${p.duration_days}d` : `ETB ${p.monthly_price}/mo`})
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && !isFree && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Billing cycle</label>
              <div className="flex gap-2">
                {[
                  { val: 'monthly', label: `Monthly · ${ETB(selectedPlan.monthly_price)}` },
                  { val: 'annual',  label: `Annual · ${ETB(selectedPlan.annual_price)}` },
                ].map(({ val, label }) => (
                  <button key={val} onClick={() => setCycle(val)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors
                      ${billingCycle === val ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isFree && (
            <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              Free plan — activates immediately. No payment required.
            </p>
          )}

          {!isFree && selectedPlan && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              Paid plan — subscription will be set to <strong>pending</strong> until you record payment.
            </p>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleAssign} disabled={!planId || saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Record Payment Modal ───────────────────────────────────────────────────────
function RecordPaymentModal({ clinic, plans, onClose, onDone }) {
  const activePlan = plans.find((p) => p.id === clinic.plan_id);
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    billing_cycle: 'monthly',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    try {
      setSaving(true); setError('');
      await recordClinicPayment(clinic.id, { ...form, amount: Number(form.amount) });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.amount && form.payment_reference && form.payment_date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Clinic: <span className="font-semibold text-gray-900">{clinic.name}</span></p>
          {activePlan && (
            <p className="text-xs text-gray-500">Plan: <span className="font-semibold">{activePlan.name}</span></p>
          )}

          {/* Billing cycle */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Billing cycle</label>
            <div className="flex gap-2">
              {['monthly', 'annual'].map((c) => (
                <button key={c} onClick={() => set('billing_cycle', c)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold capitalize transition-colors
                    ${form.billing_cycle === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}>
                  {c}
                  {activePlan && <span className="ml-1 opacity-70">· {ETB(c === 'monthly' ? activePlan.monthly_price : activePlan.annual_price)}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount paid (ETB)</label>
            <input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)}
              placeholder={activePlan ? (form.billing_cycle === 'monthly' ? activePlan.monthly_price : activePlan.annual_price) : '0'}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment method</label>
            <select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
              {['telebirr','chapa','paypal','bank_transfer','cash'].map((m) => (
                <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reference / Receipt no.</label>
            <input value={form.payment_reference} onChange={(e) => set('payment_reference', e.target.value)}
              placeholder="TRX-001234"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment date</label>
            <input type="date" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete }) {
  const isFree = plan.type === 'free';
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${plan.is_active ? 'border-gray-100 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${isFree ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {plan.type}
            </span>
            {!plan.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>}
          </div>
          {isFree ? (
            <p className="text-xs text-gray-400">Free · {plan.duration_days} days</p>
          ) : (
            <p className="text-xs text-gray-400">
              {plan.duration_value} {plan.duration_unit} · Annual billing available
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => onEdit(plan)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(plan.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {isFree ? (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-gray-900">Free</span>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Monthly</p>
            <p className="text-lg font-black text-gray-900">{ETB(plan.monthly_price)}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Annual</p>
            <p className="text-lg font-black text-gray-900">{ETB(plan.annual_price)}</p>
          </div>
        </div>
      )}

      <ul className="space-y-1">
        {(plan.features ?? []).slice(0, 4).map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />{f}
          </li>
        ))}
        {(plan.features ?? []).length > 4 && (
          <li className="text-xs text-gray-400 pl-5">+{plan.features.length - 4} more</li>
        )}
      </ul>

      <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-50">
        <span>{plan.max_users} users</span>
        <span>·</span>
        <span>{plan.max_branches} branches</span>
        <span>·</span>
        <span>{plan.max_storage_gb} GB</span>
      </div>
    </div>
  );
}

// ── Payment History Modal ──────────────────────────────────────────────────────
function PaymentHistoryModal({ clinic, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getClinicPaymentHistory(clinic.id)
      .then((r) => setHistory(r.data ?? []))
      .catch(() => setError('Failed to load payment history.'))
      .finally(() => setLoading(false));
  }, [clinic.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Payment History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{clinic.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No payment records yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((p) => (
                <div key={p.id} className="flex items-start justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.plan_name ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {p.billing_cycle} · {p.payment_method?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Ref: {p.payment_reference ?? '—'}</p>
                    <p className="text-xs text-gray-400">{p.payment_date} → {p.ends_at}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-gray-900">ETB {Number(p.amount_paid ?? 0).toLocaleString()}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === 'active'  ? 'bg-green-50 text-green-700' :
                      p.status === 'expired' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-500'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function PlatformSubscriptions() {
  const { t } = useTranslation('platform');
  const [plans,       setPlans]       = useState([]);
  const [clinics,     setClinics]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [toast,       setToast]       = useState({ msg: '', type: 'success' });

  // Modals
  const [planModal,   setPlanModal]   = useState(false);
  const [editPlan,    setEditPlan]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [assignModal, setAssignModal] = useState(null); // clinic object
  const [payModal,    setPayModal]    = useState(null); // clinic object
  const [historyModal,setHistoryModal]= useState(null); // clinic object

  // Clinic list filters
  const [search,       setSearch]     = useState('');
  const [subFilter,    setSubFilter]  = useState('all');
  const [typeFilter,   setTypeFilter] = useState('all');

  // Tab
  const [tab, setTab] = useState('plans'); // 'plans' | 'clinics'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [planRes, clinicRes] = await Promise.all([
        getPlatformPlans(),
        getClinics({ subscription_status: subFilter !== 'all' ? subFilter : undefined,
                     plan_type: typeFilter !== 'all' ? typeFilter : undefined }),
      ]);
      setPlans(planRes.data ?? []);
      setClinics(clinicRes.data ?? []);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [subFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  // Plan CRUD
  const handleSavePlan = async (formData) => {
    try {
      setSaving(true);
      if (editPlan) {
        const res = await updatePlan(editPlan.id, formData);
        setPlans((prev) => prev.map((p) => p.id === editPlan.id ? (res.data ?? { ...editPlan, ...formData }) : p));
        showToast('Plan updated.');
      } else {
        const res = await createPlan(formData);
        setPlans((prev) => [...prev, res.data ?? { id: Date.now(), ...formData }]);
        showToast('Plan created.');
      }
      setPlanModal(false); setEditPlan(null);
    } catch (e) {
      showToast(e?.response?.data?.message ?? 'Failed to save plan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Deactivate this plan? Clinics on it keep their subscription.')) return;
    try {
      await deletePlan(id);
      setPlans((prev) => prev.map((p) => p.id === id ? { ...p, is_active: false } : p));
      showToast('Plan deactivated.');
    } catch (e) {
      showToast(e?.response?.data?.message ?? 'Cannot delete — active subscriptions exist.', 'error');
    }
  };

  const filteredClinics = clinics.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.subdomain?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {planModal && (
        <PlanModal plan={editPlan} onClose={() => { setPlanModal(false); setEditPlan(null); }}
          onSave={handleSavePlan} saving={saving} />
      )}
      {assignModal && (
        <AssignPlanModal clinic={assignModal} plans={plans}
          onClose={() => setAssignModal(null)}
          onDone={() => { setAssignModal(null); load(); showToast('Plan assigned.'); }} />
      )}
      {historyModal && (
        <PaymentHistoryModal clinic={historyModal} onClose={() => setHistoryModal(null)} />
      )}
      {payModal && (
        <RecordPaymentModal clinic={payModal} plans={plans}
          onClose={() => setPayModal(null)}
          onDone={() => { setPayModal(null); load(); showToast('Payment recorded. Subscription activated.'); }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Platform Admin</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('planManagement')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('clinicSubscriptions')}</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ key: 'plans', label: t('plans') }, { key: 'clinics', label: t('clinicSubscriptions') }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors
              ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>}

      {/* ── PLANS TAB ── */}
      {tab === 'plans' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pricing Plans</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {plans.filter((p) => p.is_active).length} active · {plans.filter((p) => p.type === 'free').length} free · {plans.filter((p) => p.type === 'paid').length} paid
              </p>
            </div>
            <button onClick={() => { setEditPlan(null); setPlanModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('createPlan')}
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
              No plans yet. Click "Add plan" to create your first pricing tier.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan}
                  onEdit={(p) => { setEditPlan(p); setPlanModal(true); }}
                  onDelete={handleDeletePlan} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CLINICS TAB ── */}
      {tab === 'clinics' && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, subdomain or email..."
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
            </div>
            <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer">
              <option value="all">All plan types</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {['CLINIC', 'PLAN', t('subscriptions').toUpperCase(), t('expiryDate').toUpperCase(), 'SUBDOMAIN', t('actions').toUpperCase()].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClinics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No clinics found.</td>
                  </tr>
                ) : filteredClinics.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.subdomain ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.plan ? (
                        <div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.plan_type === 'free' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                            {c.plan}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{c.plan_type}</p>
                        </div>
                      ) : <span className="text-xs text-gray-400">No plan</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.subscription_status ? (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${subStatusColor[c.subscription_status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {c.subscription_status}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-xs text-gray-700">{c.subscription_ends_at ?? '—'}</p>
                        {c.expiry_warning && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600 font-semibold">{c.days_remaining}d left</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.subdomain_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {c.subdomain_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setAssignModal(c)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                          Assign plan
                        </button>
                        {c.plan_type === 'paid' && c.subscription_status === 'pending' && (
                          <button onClick={() => setPayModal(c)}
                            className="text-xs font-semibold text-green-600 hover:text-green-800 transition-colors px-2 py-1 rounded-lg hover:bg-green-50">
                            Record pay
                          </button>
                        )}
                        <button onClick={() => setHistoryModal(c)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
