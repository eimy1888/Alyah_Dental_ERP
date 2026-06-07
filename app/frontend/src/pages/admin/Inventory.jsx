import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Save, AlertTriangle,
  Package, TrendingDown, Clock, DollarSign,
  Loader2, RefreshCw, ChevronDown
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['all', 'restorative', 'consumables', 'pharmacy', 'instruments'];

const STATUS_BADGE = {
  healthy:      'bg-green-100 text-green-700 border border-green-200',
  low:          'bg-red-100 text-red-700 border border-red-200',
  watch:        'bg-yellow-100 text-yellow-700 border border-yellow-200',
  out_of_stock: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_LABEL = {
  healthy:      'Healthy',
  low:          'Low stock',
  watch:        'Watch expiry',
  out_of_stock: 'Out of stock',
};

const TRANSACTION_TYPES = [
  { value: 'reorder',        label: 'Reorder received' },
  { value: 'usage',          label: 'Usage deducted' },
  { value: 'adjustment',     label: 'Manual adjustment' },
  { value: 'expiry_removal', label: 'Expiry removal' },
  { value: 'transfer',       label: 'Branch transfer' },
];

const fmtETB = (n) => `${Number(n).toLocaleString()} ETB`;

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3
      ${type === 'error' ? 'bg-red-600' : 'bg-gray-900'} text-white`}>
      <span>{type === 'error' ? '❌' : '✅'}</span>
      <span className="text-sm">{msg}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}

// ── Bar Chart (SVG) ───────────────────────────────────────────────────────────
function UsageChart({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-8">No usage data.</p>;
  const max = Math.max(...data.map((d) => d.units), 1);
  const W = 480, H = 160, PAD = 32, BAR_W = 36;
  const gap = (W - PAD * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      {[0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max].map((v) => {
        const y = H - PAD - (v / max) * (H - PAD * 2);
        return (
          <g key={v}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD - 4} y={y + 4} fontSize="9" fill="#9ca3af" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = (d.units / max) * (H - PAD * 2);
        const x = PAD + i * gap + gap / 2 - BAR_W / 2;
        const y = H - PAD - barH;
        return (
          <g key={d.day}>
            <rect x={x} y={y} width={BAR_W} height={barH} rx="4" fill="#3b82f6" opacity="0.85" />
            <text x={x + BAR_W / 2} y={H - 8} fontSize="10" fill="#6b7280" textAnchor="middle">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────────────────
function AddItemModal({ branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', sku: '', category: 'consumables',
    supplier: '', location: '', branch_id: '',
    current_quantity: '', reorder_threshold: '',
    unit_cost: '', expiry_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.sku || !form.current_quantity || !form.reorder_threshold || !form.unit_cost) {
      setError('Name, SKU, quantity, threshold and unit cost are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post('/admin/inventory', {
        ...form,
        current_quantity:  parseInt(form.current_quantity),
        reorder_threshold: parseInt(form.reorder_threshold),
        unit_cost:         parseFloat(form.unit_cost),
        branch_id:         form.branch_id || null,
        expiry_date:       form.expiry_date || null,
      });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Add Inventory Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'name',     label: 'Product name',  span: true },
              { key: 'sku',      label: 'SKU',           span: false },
              { key: 'supplier', label: 'Supplier',      span: false },
              { key: 'location', label: 'Location',      span: false },
            ].map(({ key, label, span }) => (
              <div key={key} className={span ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
              </div>
            ))}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
            >
              {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Branch</label>
            <select
              value={form.branch_id}
              onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="">— No specific branch —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Numeric fields */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'current_quantity',  label: 'Current qty',  type: 'number' },
              { key: 'reorder_threshold', label: 'Reorder at',   type: 'number' },
              { key: 'unit_cost',         label: 'Unit cost (ETB)', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
              </div>
            ))}
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Expiry date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Add item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Adjust Stock Modal ────────────────────────────────────────────────────────
function AdjustModal({ item, onClose, onAdjusted }) {
  const [form, setForm]   = useState({ quantity_change: '', type: 'adjustment', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async () => {
    if (!form.quantity_change || form.quantity_change === '0') {
      setError('Quantity change cannot be zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post(`/admin/inventory/${item.id}/adjust`, {
        quantity_change: parseInt(form.quantity_change),
        type:            form.type,
        notes:           form.notes || null,
      });
      onAdjusted(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Adjustment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Adjust Stock</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.name} · Current: {item.current_quantity}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Quantity change <span className="text-gray-400">(use − for removal)</span>
            </label>
            <input
              type="number"
              value={form.quantity_change}
              onChange={(e) => setForm((p) => ({ ...p, quantity_change: e.target.value }))}
              placeholder="+10 or −5"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ item, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/admin/inventory/${item.id}/transactions`)
      .then((r) => setTransactions(r.data.data || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [item.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">Stock History</p>
              <h2 className="text-white text-xl font-bold mt-0.5">{item.name}</h2>
              <p className="text-blue-200 text-sm">{item.sku} · {item.branch}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No transaction history yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b">
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 text-left">Type</th>
                  <th className="pb-2 text-center">Change</th>
                  <th className="pb-2 text-center">New qty</th>
                  <th className="pb-2 text-left">By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 text-gray-500 text-xs">{t.performed_at}</td>
                    <td className="py-2.5 text-gray-700 text-xs capitalize">{t.type.replace('_', ' ')}</td>
                    <td className={`py-2.5 text-center font-semibold text-xs ${
                      t.quantity_change > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {t.formatted_change}
                    </td>
                    <td className="py-2.5 text-center text-gray-700 text-xs">{t.new_quantity}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{t.performed_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Inventory() {
  const [items,    setItems]    = useState([]);
  const [branches, setBranches] = useState([]);
  const [meta,     setMeta]     = useState({ total: 0, low_stock: 0, expiring: 0, total_value: 0 });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Filters
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [viewMode,   setViewMode]   = useState('cards');

  // Modals
  const [toast,       setToast]       = useState(null);
  const [addOpen,     setAddOpen]     = useState(false);
  const [adjustItem,  setAdjustItem]  = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Fetch inventory ────────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search)                   params.search   = search;
      if (category !== 'all')       params.category = category;
      if (filterMode !== 'all')     params.filter   = filterMode;

      const [invRes, branchRes] = await Promise.all([
        apiClient.get('/admin/inventory', { params }),
        apiClient.get('/admin/branches'),
      ]);

      setItems(invRes.data.data     || []);
      setMeta(invRes.data.meta      || {});
      setBranches(branchRes.data.data || []);
    } catch {
      setError('Failed to load inventory. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [search, category, filterMode]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleItemAdded = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    showToast(`${newItem.name} added to inventory.`);
  };

  const handleItemAdjusted = (updatedItem) => {
    setItems((prev) => prev.map((i) => i.id === updatedItem.id ? updatedItem : i));
    showToast(`Stock adjusted for ${updatedItem.name}.`);
  };

  const handleApproveReorder = async (item) => {
    try {
      const res = await apiClient.post(`/admin/inventory/${item.id}/adjust`, {
        quantity_change: item.reorder_threshold * 2,
        type:  'reorder',
        notes: 'Reorder approved by clinic admin',
      });
      handleItemAdjusted(res.data.data);
    } catch {
      showToast('Reorder approval failed.', 'error');
    }
  };

  // ── Stock bar color ────────────────────────────────────────────────────────
  const barColor = (status) => ({
    low:          'bg-red-500',
    watch:        'bg-yellow-500',
    healthy:      'bg-green-500',
    out_of_stock: 'bg-gray-400',
  }[status] || 'bg-gray-400');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {addOpen     && <AddItemModal branches={branches} onClose={() => setAddOpen(false)} onSaved={handleItemAdded} />}
      {adjustItem  && <AdjustModal  item={adjustItem}   onClose={() => setAdjustItem(null)} onAdjusted={handleItemAdjusted} />}
      {historyItem && <HistoryModal item={historyItem}  onClose={() => setHistoryItem(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
            Inventory Module
          </p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Products, suppliers, stock alerts,<br />expiry controls, and analytics
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Branch-ready inventory operations with stock cards, supplier workflows, and expiry monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchInventory}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards — real data from meta */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tracked SKUs',     value: meta.total        ?? 0,               sub: 'Across all branches', icon: Package,      color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Low stock alerts', value: meta.low_stock    ?? 0,               sub: 'Need reorder',        icon: TrendingDown, color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'Expiring soon',    value: meta.expiring     ?? 0,               sub: 'Within 90 days',      icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Inventory value',  value: fmtETB(meta.total_value ?? 0),        sub: 'Total stock value',   icon: DollarSign,   color: 'text-green-600',  bg: 'bg-green-50' },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </div>
                <div className={`${c.bg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKUs, products, suppliers, or locations..."
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  category === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Views */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Inventory Views</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {items.length} items · Switch between stock cards and table.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-3">
              {[['all','All'],['low','Low Stock'],['expiring','Expiring']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterMode(v)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filterMode === v ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            {['cards', 'table'].map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
                  viewMode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {m === 'cards' ? 'Stock Cards' : 'Table'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No inventory items found.</p>
            <p className="text-xs mt-1">Add your first item using the button above.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const pct = Math.min(
                (item.current_quantity / Math.max(item.reorder_threshold, 1)) * 100,
                100
              );
              return (
                <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <Package className="w-6 h-6 text-blue-400" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm mt-2">{item.name}</h3>
                  <p className="text-xs text-gray-400">{item.sku} · {item.category}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Stock level</span>
                      <span className="font-semibold text-gray-800">
                        {item.current_quantity} / {item.reorder_threshold}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`${barColor(item.status)} h-1.5 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">⛟ {item.supplier || '—'}</p>
                  <p className="text-xs text-gray-400">🕐 Exp: {item.expiry_date || 'N/A'}</p>
                  <div className="mt-3 flex gap-1.5">
                    {item.status === 'low' && (
                      <button
                        onClick={() => handleApproveReorder(item)}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Approve Reorder
                      </button>
                    )}
                    <button
                      onClick={() => setAdjustItem(item)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => setHistoryItem(item)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition-colors"
                    >
                      History
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b">
                  {['SKU','Product','Category','Stock','Threshold','Value','Expiry','Supplier','Status','Actions'].map((h) => (
                    <th key={h} className="pb-3 text-left font-medium px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs text-gray-400">{item.sku}</td>
                    <td className="py-3 px-2 font-semibold text-gray-800">{item.name}</td>
                    <td className="py-3 px-2 text-gray-500 capitalize">{item.category}</td>
                    <td className="py-3 px-2 font-semibold text-gray-800">{item.current_quantity}</td>
                    <td className="py-3 px-2 text-gray-500">{item.reorder_threshold}</td>
                    <td className="py-3 px-2 text-gray-700 text-xs">{fmtETB(item.stock_value)}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{item.expiry_date || 'N/A'}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{item.supplier || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => setAdjustItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">
                          Adjust
                        </button>
                        <button onClick={() => setHistoryItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200">
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Row: Usage Chart + Expiry Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Daily Usage — static chart (no usage tracking endpoint yet) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Daily usage trend</h2>
          <p className="text-xs text-gray-400 mb-4">Units consumed per day across all branches.</p>
          <UsageChart data={[
            { day: 'Mon', units: 14 },
            { day: 'Tue', units: 18 },
            { day: 'Wed', units: 11 },
            { day: 'Thu', units: 20 },
            { day: 'Fri', units: 15 },
            { day: 'Sat', units: 9 },
            { day: 'Sun', units: 5 },
          ]} />
        </div>

        {/* Expiry Watch — real data */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Expiry Watch</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-3">
              {items
                .filter((i) => i.expiry_date)
                .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                .map((item) => {
                  const daysLeft = item.days_to_expiry ?? 999;
                  const badge = daysLeft < 90
                    ? 'bg-red-100 text-red-700'
                    : daysLeft < 180
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700';
                  const label = daysLeft < 90 ? 'Soon' : 'OK';
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.branch} · {item.location}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{item.expiry_date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {items.filter((i) => i.expiry_date).length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">No items with expiry dates.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}