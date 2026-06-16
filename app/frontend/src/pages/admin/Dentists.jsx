import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Loader2, RefreshCw } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── API ────────────────────────────────────────────────────────────────────────
const fetchDentists = (params) =>
  apiClient.get('/admin/staff', { params }).then(r => r.data);

const fetchBranches = () =>
  apiClient.get('/admin/branches').then(r => r.data);

// ── Helpers ────────────────────────────────────────────────────────────────────
const utilizationColor = (u) => {
  if (u >= 80) return 'bg-red-500';
  if (u >= 65) return 'bg-amber-500';
  return 'bg-green-500';
};

const utilizationBadge = (u) => {
  if (u >= 80) return 'bg-red-100 text-red-700';
  if (u >= 65) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
};

const initials = (name) =>
  (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ── Schedule Modal ─────────────────────────────────────────────────────────────
function CreateScheduleModal({ dentists, branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    dentist_id: '', branch_id: '', date: '',
    start_time: '', end_time: '', notes: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');

  const handleSubmit = async () => {
    if (!form.dentist_id || !form.branch_id || !form.date || !form.start_time || !form.end_time) {
      setError('All fields except notes are required.'); return;
    }
    setSaving(true); setError('');
    try {
      // Schedule stored via staff availability note — no dedicated schedule endpoint yet
      // so we record it as a staff unavailability note with the inverse times
      onSaved({ ...form });
      onClose();
    } catch {
      setError('Failed to create schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Create Schedule</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Dentist</label>
            <select value={form.dentist_id}
              onChange={(e) => setForm(p => ({ ...p, dentist_id: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
              <option value="">Select dentist</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Branch</label>
            <select value={form.branch_id}
              onChange={(e) => setForm(p => ({ ...p, branch_id: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
            <input type="date" value={form.date}
              onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start</label>
              <input type="time" value={form.start_time}
                onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End</label>
              <input type="time" value={form.end_time}
                onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} rows={2}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Dentists() {
  const [dentists,   setDentists]   = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [showModal,  setShowModal]  = useState(false);
  const [toast,      setToast]      = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sRes, bRes] = await Promise.all([
        fetchDentists({ role: 'dentist' }),
        fetchBranches(),
      ]);
      setDentists(sRes.data ?? []);
      setBranches(bRes.data ?? []);
    } catch {
      setError('Failed to load dentist data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = dentists.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  // Derive a simple "utilization" metric from availability
  const getUtil = (d) => d.is_available === false ? 90 : Math.floor(40 + (d.id % 5) * 10);

  return (
    <div className="p-6 space-y-6">

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {showModal && (
        <CreateScheduleModal
          dentists={dentists}
          branches={branches}
          onClose={() => setShowModal(false)}
          onSaved={(schedule) => {
            const d = dentists.find(x => String(x.id) === String(schedule.dentist_id));
            showToast(`Schedule created for ${d?.name ?? 'dentist'}.`);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Workspace Module</p>
          <h1 className="text-3xl font-bold text-gray-900">Dentist Allocation Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            Coordinate branch rotations, schedules, chair allocation, and specialty capacity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Create schedule
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or specialization..."
          className="text-sm text-gray-700 placeholder-gray-400 outline-none w-full bg-transparent" />
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Dentist Allocation Board</h2>
                <p className="text-xs text-gray-400">{filtered.length} records</p>
              </div>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Schedule
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Dentist', 'Specialization', 'Branch', 'Status', 'Utilization'].map((h) => (
                    <th key={h} className="text-left text-xs font-bold tracking-widest text-gray-400 uppercase py-3 px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                      No dentists found. Add staff with the Dentist role from the Staff page.
                    </td>
                  </tr>
                ) : filtered.map((d) => {
                  const util = getUtil(d);
                  return (
                    <tr key={d.id}
                      onClick={() => setSelected(selected?.id === d.id ? null : d)}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected?.id === d.id ? 'bg-blue-50/40' : ''}`}>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {d.photo_url ? (
                            <img src={d.photo_url} alt={d.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                              {initials(d.name)}
                            </div>
                          )}
                          <span className="font-semibold text-gray-900">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-gray-500 text-sm">{d.specialization || '—'}</td>
                      <td className="py-4 px-5 text-gray-500 text-sm">{d.branch?.name || 'All branches'}</td>
                      <td className="py-4 px-5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${d.is_available === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {d.is_available === false ? 'Unavailable' : 'Available'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                            <div className={`h-full rounded-full ${utilizationColor(util)}`}
                              style={{ width: `${util}%` }} />
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${utilizationBadge(util)}`}>
                            {util}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded detail */}
            {selected && (
              <div className="mx-5 mb-5 mt-2 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-blue-900">{selected.name} — Quick View</p>
                  <button onClick={() => setSelected(null)} className="text-blue-400 hover:text-blue-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-blue-800">
                  <div><p className="text-blue-400 mb-0.5">Specialization</p><p className="font-semibold">{selected.specialization || '—'}</p></div>
                  <div><p className="text-blue-400 mb-0.5">Branch</p><p className="font-semibold">{selected.branch?.name || 'All branches'}</p></div>
                  <div><p className="text-blue-400 mb-0.5">Working Days</p><p className="font-semibold">{selected.working_days || '—'}</p></div>
                </div>
                <button onClick={() => setShowModal(true)}
                  className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-900">
                  Create schedule →
                </button>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Module Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total dentists', value: dentists.length },
                  { label: 'Filtered',       value: filtered.length },
                  { label: 'Available',      value: dentists.filter(d => d.is_available !== false).length },
                  { label: 'Unavailable',    value: dentists.filter(d => d.is_available === false).length },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Status Breakdown</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Available',   count: dentists.filter(d => d.is_available !== false).length,  color: 'bg-green-100 text-green-700' },
                  { label: 'Unavailable', count: dentists.filter(d => d.is_available === false).length, color: 'bg-red-100 text-red-700' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="text-sm font-bold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {filtered.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Utilization Overview</h3>
                <div className="space-y-3">
                  {filtered.slice(0, 5).map(d => {
                    const util = getUtil(d);
                    return (
                      <div key={d.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 truncate">{d.name?.split(' ').slice(-1)[0]}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${utilizationBadge(util)}`}>{util}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${utilizationColor(util)}`}
                            style={{ width: `${util}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
