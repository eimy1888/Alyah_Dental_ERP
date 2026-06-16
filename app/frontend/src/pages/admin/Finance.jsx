import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/axiosInstance';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-ET', { style: 'decimal', maximumFractionDigits: 0 })
    .format(n) + ' ETB';

const EXPENSE_CATEGORIES = [
  'rent', 'salaries', 'supplies', 'utilities',
  'equipment', 'marketing', 'maintenance', 'other',
];

const statusStyles = {
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info:    'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger:  'bg-rose-50 text-rose-700 ring-rose-200',
};

const METHOD_COLORS = {
  cash:          '#2563EB',
  telebirr:      '#10B981',
  chapa:         '#06B6D4',
  bank_transfer: '#F59E0B',
  insurance:     '#8B5CF6',
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[500] flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-xl
      ${type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-white border-white/60 text-slate-900'}`}>
      <span className="text-sm font-semibold">{msg}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
    </div>
  );
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = '#2563EB' }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-2 h-36 w-full pt-2">
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex flex-col justify-end h-28">
              <div
                className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80"
                style={{ height: `${pct}%`, background: color }}
              />
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500
                opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {(d[valueKey] / 1000).toFixed(0)}K
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Line Chart (SVG) ─────────────────────────────────────────────────────────
function LineChart({ data, valueKey, labelKey, color = '#2563EB' }) {
  if (!data?.length) return null;
  const max   = Math.max(...data.map((d) => d[valueKey]), 1);
  const min   = Math.min(...data.map((d) => d[valueKey]));
  const range = max - min || 1;
  const w = 300, h = 120, pad = 12;

  const pts = data.map((d, i) => [
    pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2),
    h - pad - ((d[valueKey] - min) / range) * (h - pad * 2),
  ]);

  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const area = path + ` L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineGrad)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between px-3 mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-slate-400 font-medium">{d[labelKey]}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const r = 48, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {data.map((seg, i) => {
          const pct  = total > 0 ? (seg.total / total) * 100 : 0;
          const dash = (pct / 100) * circ;
          const gap  = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={METHOD_COLORS[seg.method] || '#94a3b8'}
              strokeWidth="18"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          className="fill-slate-800" fontSize="11" fontWeight="700">Mix</text>
      </svg>
      <div className="space-y-2">
        {data.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.total / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: METHOD_COLORS[seg.method] || '#94a3b8' }} />
              <span className="text-xs text-slate-600 capitalize">
                {seg.method.replace('_', ' ')} <strong className="text-slate-900">{pct}%</strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────
function AddExpenseModal({ branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    category: 'supplies', description: '', amount: '',
    vendor: '', expense_date: new Date().toISOString().split('T')[0],
    branch_id: '', reference: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async () => {
    if (!form.description || !form.amount || !form.expense_date) {
      setError('Description, amount and date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post('/admin/finance/expenses', {
        ...form,
        amount:    parseFloat(form.amount),
        branch_id: form.branch_id || null,
      });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl p-7 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-xl">×</button>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Finance</p>
        <h3 className="text-xl font-semibold text-slate-950 mb-5">Record Expense</h3>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
            <select value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white capitalize">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <input value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Monthly office rent"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (ETB)</label>
              <input type="number" value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
              <input type="date" value={form.expense_date}
                onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Vendor + Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Vendor <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={form.vendor}
                onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
                placeholder="Supplier name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Branch</label>
              <select value={form.branch_id}
                onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
                <option value="">— All branches —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={form.notes} rows={2}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 rounded-2xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Record Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Finance Page ────────────────────────────────────────────────────────
export default function Finance() {
  const [summary,        setSummary]        = useState(null);
  const [trend,          setTrend]          = useState([]);
  const [branchBreakdown,setBranchBreakdown]= useState([]);
  const [expenses,       setExpenses]       = useState([]);
  const [branches,       setBranches]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [toast,          setToast]          = useState(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [selectedMonth,  setSelectedMonth]  = useState(
    new Date().toISOString().slice(0, 7)  // YYYY-MM
  );

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  // ── Fetch all finance data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, trendRes, branchRes, expenseRes, branchListRes] =
        await Promise.all([
          apiClient.get('/admin/finance/summary',          { params: { month: selectedMonth } }),
          apiClient.get('/admin/finance/revenue-trend',    { params: { months: 6 } }),
          apiClient.get('/admin/finance/branch-breakdown', { params: { month: selectedMonth } }),
          apiClient.get('/admin/finance/expenses',         { params: { per_page: 10 } }),
          apiClient.get('/admin/branches'),
        ]);

      setSummary(summaryRes.data.data);
      setTrend(trendRes.data.data         || []);
      setBranchBreakdown(branchRes.data.data || []);
      setExpenses(expenseRes.data.data    || []);
      setBranches(branchListRes.data.data || []);
    } catch {
      setError('Failed to load finance data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExpenseSaved = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    showToast('Expense recorded successfully.');
    fetchData(); // refresh summary
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await apiClient.delete(`/admin/finance/expenses/${expenseId}`);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      showToast('Expense deleted.');
      fetchData();
    } catch {
      showToast('Failed to delete expense.', 'error');
    }
  };

  // ── Build chart data from real trend ─────────────────────────────────────
  const trendChartData = trend.map((t) => ({
    month:   t.month,
    revenue: t.revenue,
    expenses:t.expenses,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {addExpenseOpen && (
        <AddExpenseModal
          branches={branches}
          onClose={() => setAddExpenseOpen(false)}
          onSaved={handleExpenseSaved}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Finance Module</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Financial Overview
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Revenue, expenses, payer mix, and branch breakdown — all real data from your clinic.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector */}
          <input type="month" value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400" />
          <button onClick={() => setAddExpenseOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            + Record Expense
          </button>
          <button onClick={() => {
            if (!expenses.length) { showToast('No expenses to export.', 'error'); return; }
            const rows = [
              ['Date','Category','Description','Vendor','Branch','Amount (ETB)'],
              ...expenses.map(e => [e.expense_date, e.category, e.description, e.vendor || '', e.branch, e.amount]),
            ];
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `expenses-${selectedMonth}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            ↓ Export
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── KPI Cards — real data ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'MTD Revenue',
            value: fmt(summary?.revenue ?? 0),
            sub:   `${selectedMonth}`,
            icon:  '📈',
            tone:  'blue',
          },
          {
            label: 'MTD Expenses',
            value: fmt(summary?.expenses ?? 0),
            sub:   'Approved expenses',
            icon:  '📉',
            tone:  'amber',
          },
          {
            label: 'Net Profit',
            value: fmt(summary?.net_profit ?? 0),
            sub:   `${summary?.profit_margin ?? 0}% margin`,
            icon:  '💰',
            tone:  'emerald',
          },
          {
            label: 'Outstanding AR',
            value: fmt(summary?.outstanding ?? 0),
            sub:   'Unpaid invoices',
            icon:  '⏳',
            tone:  'cyan',
          },
        ].map((card) => {
          const toneMap = {
            emerald: 'bg-emerald-50 text-emerald-700',
            blue:    'bg-blue-50 text-blue-700',
            amber:   'bg-amber-50 text-amber-700',
            cyan:    'bg-cyan-50 text-cyan-700',
          };
          return (
            <div key={card.label}
              className="rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">{card.sub}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${toneMap[card.tone]}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row — real trend data ── */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Revenue trend */}
        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-slate-950">Revenue Trend</h3>
          <p className="mt-1 text-sm text-slate-500">Monthly revenue — last 6 months (ETB)</p>
          <LineChart
            data={trendChartData}
            valueKey="revenue"
            labelKey="month"
            color="#2563EB"
          />
        </div>

        {/* Expense trend */}
        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-slate-950">Expense Trend</h3>
          <p className="mt-1 text-sm text-slate-500">Monthly expenses — last 6 months (ETB)</p>
          <BarChart
            data={trendChartData}
            valueKey="expenses"
            labelKey="month"
            color="#f59e0b"
          />
        </div>
      </div>

      {/* ── Payer Mix + Branch Breakdown — real data ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">

        {/* Payer Mix */}
        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-slate-950 mb-5">Payer Mix</h3>
          {summary?.payment_methods?.length > 0 ? (
            <DonutChart data={summary.payment_methods} />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No payment data for this period.</p>
          )}
        </div>

        {/* Branch Revenue Breakdown */}
        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-slate-950 mb-5">Branch Revenue Breakdown</h3>
          {branchBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No branch data available.</p>
          ) : (
            <div className="space-y-4">
              {branchBreakdown.map((br) => {
                const totalRevenue = branchBreakdown.reduce((s, b) => s + b.revenue, 0);
                const share = totalRevenue > 0
                  ? Math.round((br.revenue / totalRevenue) * 100)
                  : 0;
                return (
                  <div key={br.branch_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-900">{br.branch_name}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-900">{fmt(br.revenue)}</span>
                        <span className="block text-[10px] text-slate-400">MTD · {share}% share</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-slate-400">
                        Expenses: {fmt(br.expenses)}
                      </p>
                      <p className={`text-xs font-semibold ${br.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Net: {fmt(br.net)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Expenses Table — real data ── */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-200/80 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Recent Expenses</h3>
            <p className="mt-0.5 text-sm text-slate-500">{expenses.length} records</p>
          </div>
          <button onClick={() => setAddExpenseOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            + Add Expense
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/70">
              <tr>
                {['Date', 'Category', 'Description', 'Vendor', 'Branch', 'Amount', ''].map((col) => (
                  <th key={col}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    No expenses recorded yet.{' '}
                    <button onClick={() => setAddExpenseOpen(true)}
                      className="text-blue-600 font-semibold hover:underline">
                      Add one
                    </button>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500">{expense.expense_date}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{expense.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{expense.vendor || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{expense.branch}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {fmt(expense.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Invoice Status Summary — real data ── */}
      {summary?.invoice_counts && Object.keys(summary.invoice_counts).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(summary.invoice_counts).map(([status, count]) => {
            const colorMap = {
              paid:    'bg-emerald-50 text-emerald-700',
              partial: 'bg-blue-50 text-blue-700',
              overdue: 'bg-red-50 text-red-700',
              sent:    'bg-amber-50 text-amber-700',
              draft:   'bg-slate-50 text-slate-700',
            };
            return (
              <div key={status}
                className={`rounded-2xl p-4 ${colorMap[status] || 'bg-slate-50 text-slate-700'}`}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1 ">
                  {status}
                </p>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-0.5 opacity-70">invoices</p>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}