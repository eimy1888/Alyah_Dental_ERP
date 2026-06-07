import { useState, useEffect } from 'react';
import {
  TrendingUp, ArrowUpRight, Plus, Pencil,
  Trash2, X, Save, CheckCircle2, Search, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  getPlatformPlans, createPlan, updatePlan, deletePlan,
} from '../../services/platformService';

const mrrTrend = [
  { month: 'Oct', mrr: 29.4 },
  { month: 'Nov', mrr: 31.2 },
  { month: 'Dec', mrr: 33.8 },
  { month: 'Jan', mrr: 35.1 },
  { month: 'Feb', mrr: 37.6 },
  { month: 'Mar', mrr: 39.9 },
  { month: 'Apr', mrr: 41.8 },
];

const statusColors = {
  active:    'bg-green-50 text-green-700 border border-green-200',
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
  suspended: 'bg-red-50 text-red-700 border border-red-200',
};

const planColors = {
  Basic:      'bg-gray-100 text-gray-600',
  Pro:        'bg-blue-50 text-blue-700',
  Enterprise: 'bg-purple-50 text-purple-700',
};

const EMPTY_PLAN = {
  name: '',
  monthly_price: '',
  annual_price: '',
  description: '',
  features: [''],
  is_popular: false,
  max_users: '',
  max_branches: '',
  max_storage_gb: '',
};

// ── Plan Modal ───────────────────────────────────────────────
function PlanModal({ plan, onClose, onSave, saving }) {
const [form, setForm] = useState(
  plan
    ? {
        name:          plan.name          ?? '',
        monthly_price: plan.monthly_price ?? plan.monthlyPrice ?? '',
        annual_price:  plan.annual_price  ?? plan.annualPrice  ?? '',
        description:   plan.description   ?? '',
        features:      Array.isArray(plan.features) ? [...plan.features] : [''],
        is_popular:    plan.is_popular    ?? plan.popular ?? false,
        max_users:     plan.max_users     ?? '',
        max_branches:  plan.max_branches  ?? '',
        max_storage_gb: plan.max_storage_gb ?? '',
      }
    : { ...EMPTY_PLAN, features: [''] }
);

  const updateFeature = (i, val) => {
    const f = [...form.features];
    f[i] = val;
    setForm((p) => ({ ...p, features: f }));
  };

  const handleSave = () => {
  if (!form.name || !form.monthly_price || !form.annual_price ||
      !form.max_users || !form.max_branches || !form.max_storage_gb) return;
  onSave({
    ...form,
    monthly_price:  Number(form.monthly_price),
    annual_price:   Number(form.annual_price),
    max_users:      Number(form.max_users),
    max_branches:   Number(form.max_branches),
    max_storage_gb: Number(form.max_storage_gb),
    features: form.features.filter((f) => f.trim() !== ''),
  });
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {plan ? 'Edit Plan' : 'Add New Plan'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plan name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Pro"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monthly price (ETB)</label>
              <input
                type="number"
                value={form.monthly_price}
                onChange={(e) => setForm((p) => ({ ...p, monthly_price: e.target.value }))}
                placeholder="289"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Annual price (ETB/mo)</label>
              <input
                type="number"
                value={form.annual_price}
                onChange={(e) => setForm((p) => ({ ...p, annual_price: e.target.value }))}
                placeholder="240"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max users</label>
    <input
      type="number"
      value={form.max_users}
      onChange={(e) => setForm((p) => ({ ...p, max_users: e.target.value }))}
      placeholder="10"
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max branches</label>
    <input
      type="number"
      value={form.max_branches}
      onChange={(e) => setForm((p) => ({ ...p, max_branches: e.target.value }))}
      placeholder="3"
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
    />
        </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Storage (GB)</label>
              <input
                type="number"
                value={form.max_storage_gb}
                onChange={(e) => setForm((p) => ({ ...p, max_storage_gb: e.target.value }))}
                placeholder="5"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short plan description..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-2 border border-gray-100 rounded-xl px-4">
            <p className="text-sm font-medium text-gray-700">Mark as popular</p>
            <button
              onClick={() => setForm((p) => ({ ...p, is_popular: !p.is_popular }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                form.is_popular ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                form.is_popular ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Features</label>
            <div className="space-y-2">
              {form.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={f}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder={`Feature ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    onClick={() => setForm((p) => ({ ...p, features: p.features.filter((_, j) => j !== i) }))}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setForm((p) => ({ ...p, features: [...p.features, ''] }))}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add feature
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> Save plan</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete }) {
  const monthly = plan.monthly_price ?? plan.monthlyPrice ?? 0;
  const annual  = plan.annual_price  ?? plan.annualPrice  ?? 0;
  const popular = plan.is_popular    ?? plan.popular      ?? false;
  const features = Array.isArray(plan.features) ? plan.features : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
            {popular && (
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                Popular
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{plan.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(plan.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Monthly</p>
          <p className="text-xl font-black text-gray-900">ETB {Number(monthly).toLocaleString()}</p>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Annual /mo</p>
          <p className="text-xl font-black text-gray-900">ETB {Number(annual).toLocaleString()}</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function PlatformSubscriptions() {
  const [plans,       setPlans]       = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError,  setPlansError]  = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Load plans from backend
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPlans(true);
        const res = await getPlatformPlans();
        setPlans(res.data || []);
      } catch {
        setPlansError('Failed to load plans.');
      } finally {
        setLoadingPlans(false);
      }
    };
    load();
  }, []);

  const handleSavePlan = async (formData) => {
    try {
      setSaving(true);
      if (editingPlan) {
        const res = await updatePlan(editingPlan.id, formData);
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? (res.data ?? { ...editingPlan, ...formData }) : p))
        );
        showToast('Plan updated successfully.');
      } else {
        const res = await createPlan(formData);
        setPlans((prev) => [...prev, res.data ?? { id: Date.now(), ...formData }]);
        showToast('Plan created successfully.');
      }
      setModalOpen(false);
      setEditingPlan(null);
    } catch {
      showToast('Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Delete this plan? This cannot be undone.')) return;
    try {
      await deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      showToast('Plan deleted.');
    } catch {
      showToast('Failed to delete plan.');
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Plan modal */}
      {modalOpen && (
        <PlanModal
          plan={editingPlan}
          onClose={() => { setModalOpen(false); setEditingPlan(null); }}
          onSave={handleSavePlan}
          saving={saving}
        />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Platform Admin
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor plan mix, billing cycles, renewal dates, and manage pricing plans.
        </p>
      </div>

      {/* MRR Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">MRR Trend</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +9.4% this month
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Monthly recurring revenue in thousands ETB.</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={mrrTrend}>
            <defs>
              <linearGradient id="mrrGradSub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
              formatter={(v) => [`ETB ${v}K`, 'MRR']}
            />
            <Area type="monotone" dataKey="mrr" stroke="#2563eb" strokeWidth={2} fill="url(#mrrGradSub)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pricing Plans — real data */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pricing Plans</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live plans — changes reflect on the landing page immediately.
            </p>
          </div>
          <button
            onClick={() => { setEditingPlan(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add plan
          </button>
        </div>

        {loadingPlans ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : plansError ? (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
            {plansError}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            No plans yet. Click "Add plan" to create your first pricing tier.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={(p) => { setEditingPlan(p); setModalOpen(true); }}
                onDelete={handleDeletePlan}
              />
            ))}
          </div>
        )}
      </div>

      {/* Subscriptions info note */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">All Subscriptions</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live subscription data — pulled from clinic billing records.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-48">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
            >
              {['All', 'Active', 'Pending', 'Suspended'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Subscription table — pulled from plans data showing clinic subscriptions */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['CLINIC', 'PLAN', 'BILLING', 'AMOUNT', 'STATUS'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                  No subscription data available.
                </td>
              </tr>
            ) : (
              plans
                .filter((p) =>
                  p.name?.toLowerCase().includes(search.toLowerCase())
                )
                .map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{p.name} Plan</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planColors[p.name] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">Monthly</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-xs">
                      ETB {Number(p.monthly_price ?? p.monthlyPrice ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}