import { useState, useEffect } from 'react';
import { Search, Download, ExternalLink, Loader2 } from 'lucide-react';
import { getClinics, suspendClinic, reactivateClinic } from '../../services/platformService';

const statusColors = {
  active:                    'bg-green-50 text-green-700 border border-green-200',
  pending_platform_approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  suspended:                 'bg-red-50 text-red-700 border border-red-200',
  rejected:                  'bg-gray-100 text-gray-500 border border-gray-200',
  pending_payment:           'bg-blue-50 text-blue-700 border border-blue-200',
};

const statusLabel = {
  active:                    'Active',
  pending_platform_approval: 'Pending',
  suspended:                 'Suspended',
  rejected:                  'Rejected',
  pending_payment:           'Pending Payment',
};

const planColors = {
  Basic:      'bg-gray-100 text-gray-600',
  Pro:        'bg-blue-50 text-blue-700',
  Enterprise: 'bg-purple-50 text-purple-700',
};

export default function PlatformClinics() {
  const [clinics,  setClinics]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [segment,  setSegment]  = useState('All');
  const [actionId, setActionId] = useState(null);
  const [toast,    setToast]    = useState('');

  const segments = ['All', 'Active', 'Pending', 'Suspended'];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getClinics();
        setClinics(res.data || []);
      } catch {
        setError('Failed to load clinics.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSuspend = async (id) => {
    try {
      setActionId(id);
      await suspendClinic(id);
      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'suspended' } : c))
      );
      showToast('Clinic suspended successfully.');
    } catch {
      showToast('Failed to suspend clinic.');
    } finally {
      setActionId(null);
    }
  };

  const handleReactivate = async (id) => {
    try {
      setActionId(id);
      await reactivateClinic(id);
      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c))
      );
      showToast('Clinic reactivated successfully.');
    } catch {
      showToast('Failed to reactivate clinic.');
    } finally {
      setActionId(null);
    }
  };

  const filtered = clinics.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.owner?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase());
    const matchSegment =
      segment === 'All' ||
      (segment === 'Active'    && c.status === 'active') ||
      (segment === 'Pending'   && c.status === 'pending_platform_approval') ||
      (segment === 'Suspended' && c.status === 'suspended');
    return matchSearch && matchSegment;
  });

  const summary = {
    total:    clinics.length,
    filtered: filtered.length,
    active:   clinics.filter((c) => c.status === 'active').length,
    pending:  clinics.filter((c) => c.status === 'pending_platform_approval').length,
    suspended: clinics.filter((c) => c.status === 'suspended').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Workspace Module
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clinic Portfolio</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review tenant health, plan mix, account status, and regional expansion.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search clinic portfolio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer hover:border-gray-300 transition-colors"
        >
          {segments.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All segments' : s}</option>
          ))}
        </select>
      </div>

      {/* Main content + sidebar */}
      <div className="flex gap-4">

        {/* Table card */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Clinic Portfolio</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['CLINIC', 'OWNER', 'PLAN', 'CITY', 'STATUS', 'ACTIONS'].map((h) => (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No clinics found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{c.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-sm">{c.owner}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planColors[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.plan ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-sm">{c.city}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[c.status]}`}>
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {c.status === 'active' && (
                          <button
                            onClick={() => handleSuspend(c.id)}
                            disabled={actionId === c.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors disabled:opacity-40"
                          >
                            {actionId === c.id ? 'Working...' : 'Suspend'}
                          </button>
                        )}
                        {c.status === 'suspended' && (
                          <button
                            onClick={() => handleReactivate(c.id)}
                            disabled={actionId === c.id}
                            className="text-xs font-semibold text-green-600 hover:text-green-800 transition-colors disabled:opacity-40"
                          >
                            {actionId === c.id ? 'Working...' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Module Summary sidebar */}
        <div className="w-56 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 mb-3">Module Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total records', value: summary.total },
                { label: 'Filtered',      value: summary.filtered },
                { label: 'Action needed', value: summary.pending },
                { label: 'Last updated',  value: 'Today' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`font-bold mt-0.5 ${item.label === 'Last updated' ? 'text-base text-gray-900' : 'text-xl text-gray-900'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 mb-3">Status Breakdown</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Active / Healthy', count: summary.active,    color: 'bg-green-50 text-green-700 border-green-200' },
                { label: 'Needs attention',  count: summary.pending,   color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: 'Suspended',        count: summary.suspended, color: 'bg-red-50 text-red-700 border-red-200' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.color}`}>
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}