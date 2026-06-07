import { useState, useEffect } from 'react';
import { Search, Plus, X, Save, Loader2, Package, AlertTriangle, ArrowUpDown } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

const stockStatus = (item) => {
  if (item.current_quantity <= 0) return 'out';
  if (item.current_quantity <= item.reorder_threshold) return 'low';
  return 'ok';
};

const stockColors = {
  out: 'bg-red-50 text-red-700 border border-red-200',
  low: 'bg-amber-50 text-amber-700 border border-amber-200',
  ok:  'bg-green-50 text-green-700 border border-green-200',
};

const stockLabel = {
  out: 'Out of Stock',
  low: 'Low Stock',
  ok:  'In Stock',
};

const EMPTY_FORM = {
  name:              '',
  sku:               '',
  unit:              'units',
  current_quantity:  0,
  reorder_threshold: 10,
  notes:             '',
};

const UNITS = ['units', 'boxes', 'vials', 'tubes', 'packs', 'bottles', 'pairs', 'rolls'];

function InventoryModal({ item, onClose, onSave, saving }) {
  const [form, setForm] = useState(
    item
      ? {
          name:              item.name,
          sku:               item.sku ?? '',
          unit:              item.unit ?? 'units',
          current_quantity:  item.current_quantity,
          reorder_threshold: item.reorder_threshold,
          notes:             item.notes ?? '',
        }
      : { ...EMPTY_FORM }
  );
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!form.name) {
      setError('Item name is required.');
      return;
    }
    setError('');
    onSave({
      ...form,
      current_quantity:  Number(form.current_quantity),
      reorder_threshold: Number(form.reorder_threshold),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {item ? 'Edit Item' : 'Add Inventory Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Composite Resin A2"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                placeholder="INV-001"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors bg-white"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Current quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.current_quantity}
                onChange={(e) => setForm((p) => ({ ...p, current_quantity: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Reorder threshold
              </label>
              <input
                type="number"
                min="0"
                value={form.reorder_threshold}
                onChange={(e) => setForm((p) => ({ ...p, reorder_threshold: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Supplier info, storage notes..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
            />
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> {item ? 'Update' : 'Add Item'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ item, onClose, onAdjust, saving }) {
  const [type,   setType]   = useState('add');
  const [qty,    setQty]    = useState('');
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');

  const handleAdjust = () => {
    if (!qty || Number(qty) <= 0) {
      setError('Enter a valid quantity.');
      return;
    }
    setError('');
    onAdjust({ type, quantity: Number(qty), reason });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Adjust Stock</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
            {['add', 'remove'].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  type === t
                    ? t === 'add'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'add' ? '+ Add Stock' : '− Remove Stock'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Quantity ({item.unit ?? 'units'})
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Restocked, consumed, damaged..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            Current: <span className="font-bold text-gray-900">
              {item.current_quantity} {item.unit ?? 'units'}
            </span>
            {qty && Number(qty) > 0 && (
              <> → After: <span className="font-bold text-gray-900">
                {type === 'add'
                  ? item.current_quantity + Number(qty)
                  : Math.max(0, item.current_quantity - Number(qty))
                } {item.unit ?? 'units'}
              </span></>
            )}
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
            onClick={handleAdjust}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 ${
              type === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><ArrowUpDown className="w-4 h-4" /> Confirm</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerInventory() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [adjustItem,  setAdjustItem]  = useState(null);
  const [editing,     setEditing]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/manager/inventory');
      setItems(res.data.data ?? []);
    } catch {
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      setSaving(true);
      if (editing) {
        await apiClient.put(`/manager/inventory/${editing.id}`, form);
        showToast('Item updated.');
      } else {
        await apiClient.post('/manager/inventory', form);
        showToast('Item added.');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to save item.';
      showToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async (data) => {
    try {
      setSaving(true);
      await apiClient.post(`/manager/inventory/${adjustItem.id}/adjust`, data);
      showToast('Stock adjusted.');
      setAdjustItem(null);
      load();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to adjust stock.';
      showToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      await apiClient.delete(`/manager/inventory/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast('Item deleted.');
    } catch {
      showToast('Failed to delete item.');
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const status = stockStatus(item);
    const matchStock =
      stockFilter === 'All' ||
      (stockFilter === 'Low'  && status === 'low') ||
      (stockFilter === 'Out'  && status === 'out') ||
      (stockFilter === 'OK'   && status === 'ok');
    return matchSearch && matchStock;
  });

  const counts = {
    total: items.length,
    low:   items.filter((i) => stockStatus(i) === 'low').length,
    out:   items.filter((i) => stockStatus(i) === 'out').length,
    ok:    items.filter((i) => stockStatus(i) === 'ok').length,
  };

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
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <InventoryModal
          item={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {adjustItem && (
        <AdjustModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onAdjust={handleAdjust}
          saving={saving}
        />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Branch Manager
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track dental supplies, stock levels, and reorder alerts.
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: counts.total, bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'In Stock',    value: counts.ok,    bg: 'bg-green-50',  color: 'text-green-600' },
          { label: 'Low Stock',   value: counts.low,   bg: 'bg-amber-50',  color: 'text-amber-600' },
          { label: 'Out of Stock',value: counts.out,   bg: 'bg-red-50',    color: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert banner */}
      {counts.low > 0 || counts.out > 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">
              {counts.out > 0 ? `${counts.out} item(s) out of stock` : ''}
              {counts.out > 0 && counts.low > 0 ? ' and ' : ''}
              {counts.low > 0 ? `${counts.low} item(s) low on stock` : ''}
            </span>
            {' '}— review and reorder as needed.
          </p>
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search items by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
        >
          <option value="All">All stock</option>
          <option value="OK">In Stock</option>
          <option value="Low">Low Stock</option>
          <option value="Out">Out of Stock</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No inventory items found.</p>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Add first item
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['ITEM', 'SKU', 'QUANTITY', 'THRESHOLD', 'UNIT', 'STATUS', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = stockStatus(item);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{item.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">
                      {item.sku ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${
                        status === 'out' ? 'text-red-600' :
                        status === 'low' ? 'text-amber-600' :
                        'text-gray-900'
                      }`}>
                        {item.current_quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {item.reorder_threshold}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {item.unit ?? 'units'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stockColors[status]}`}>
                        {stockLabel[status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAdjustItem(item)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => { setEditing(item); setModalOpen(true); }}
                          className="px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}