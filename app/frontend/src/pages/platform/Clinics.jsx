import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, Loader2, Shield, ShieldOff, AlertTriangle, Globe, GlobeLock } from 'lucide-react';
import {
  getClinics, suspendClinic, reactivateClinic,
  disableClinicSubdomain, enableClinicSubdomain,
} from '../../services/platformService';

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

const planTypeColor = {
  free: 'bg-green-50 text-green-700',
  paid: 'bg-blue-50 text-blue-700',
};

export default function PlatformClinics() {
  const { t } = useTranslation('platform');
  const [clinics,  setClinics]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [segment,  setSegment]  = useState('All');
  const [actionId, setActionId] = useState(null);
  const [toast,    setToast]    = useState({ msg: '', type: 'success' });

  const segments = ['All', 'Active', 'Pending', 'Suspended'];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3200);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await getClinics();
      setClinics(res.data ?? []);
    } catch {
      setError('Failed to load clinics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const withAction = async (id, fn, optimisticUpdate, successMsg, failMsg) => {
    try {
      setActionId(id);
      await fn();
      setClinics((prev) => prev.map((c) => c.id === id ? { ...c, ...optimisticUpdate } : c));
      showToast(successMsg);
    } catch (e) {
      showToast(e?.response?.data?.message ?? failMsg, 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleSuspend = (id) =>
    withAction(id, () => suspendClinic(id),
      { status: 'suspended', subdomain_active: false },
      'Clinic suspended.', 'Failed to suspend clinic.');

  const handleReactivate = (id) =>
    withAction(id, () => reactivateClinic(id),
      { status: 'active' },
      'Clinic reactivated.', 'Failed to reactivate clinic.');

  const handleDisableSubdomain = (id) =>
    withAction(id, () => disableClinicSubdomain(id),
      { subdomain_active: false },
      'Subdomain disabled.', 'Failed to disable subdomain.');

  const handleEnableSubdomain = (id) =>
    withAction(id, () => enableClinicSubdomain(id),
      { subdomain_active: true },
      'Subdomain enabled.', 'Failed to enable subdomain.');

  const filtered = clinics.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name?.toLowerCase().includes(q) ||
      c.subdomain?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.owner?.toLowerCase().includes(q);
    const matchSegment =
      segment === 'All' ||
      (segment === 'Active'    && c.status === 'active') ||
      (segment === 'Pending'   && c.status === 'pending_platform_approval') ||
      (segment === 'Suspended' && c.status === 'suspended');
    return matchSearch && matchSegment;
  });

  const summary = {
    total:     clinics.length,
    active:    clinics.filter((c) => c.status === 'active').length,
    pending:   clinics.filter((c) => c.status === 'pending_platform_approval').length,
    suspended: clinics.filter((c) => c.status === 'suspended').length,
    expiring:  clinics.filter((c) => c.expiry_warning).length,
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
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Workspace Module</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('clinics')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage clinic access, subdomain control, plan status, and subscription health.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Expiry warning banner */}
      {summary.expiring > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-200 font-medium">
            <strong>{summary.expiring}</strong> clinic{summary.expiring > 1 ? 's' : ''} {summary.expiring > 1 ? 'have' : 'has'} a subscription expiring within 7 days.
          </p>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by name, subdomain or email..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none bg-transparent" />
        </div>
        <select value={segment} onChange={(e) => setSegment(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 outline-none cursor-pointer hover:border-gray-300">
          {segments.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All segments' : s}</option>
          ))}
        </select>
      </div>

      {/* Main + sidebar */}
      <div className="flex gap-4">

        {/* Table */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Clinic Portfolio</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {[t('clinicName').toUpperCase(), 'PLAN', t('subscriptions').toUpperCase(), 'SUBDOMAIN', t('status').toUpperCase(), t('actions').toUpperCase()].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No clinics found.</td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{c.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{c.subdomain ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.plan ? (
                        <div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planTypeColor[c.plan_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {c.plan}
                          </span>
                          {c.expiry_warning && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] text-amber-600 font-semibold">{c.days_remaining}d left</span>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-400">No plan</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.subscription_status ? (
                        <div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
                            ${c.subscription_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              c.subscription_status === 'expired' ? 'bg-red-50 text-red-700 border-red-200' :
                              c.subscription_status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {c.subscription_status}
                          </span>
                          {c.subscription_ends_at && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{c.subscription_ends_at}</p>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit
                        ${c.subdomain_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {c.subdomain_active
                          ? <><Globe className="w-3 h-3" /> {t('active')}</>
                          : <><GlobeLock className="w-3 h-3" /> {t('disabled')}</>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[c.status]}`}>
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Suspend / Reactivate */}
                        {c.status === 'active' && (
                          <button onClick={() => handleSuspend(c.id)} disabled={actionId === c.id}
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40">
                            <ShieldOff className="w-3.5 h-3.5" />
                            {actionId === c.id ? '...' : 'Suspend'}
                          </button>
                        )}
                        {c.status === 'suspended' && (
                          <button onClick={() => handleReactivate(c.id)} disabled={actionId === c.id}
                            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-800 px-2 py-1 rounded-lg hover:bg-green-50 disabled:opacity-40">
                            <Shield className="w-3.5 h-3.5" />
                            {actionId === c.id ? '...' : 'Reactivate'}
                          </button>
                        )}
                        {/* Subdomain toggle */}
                        {c.subdomain_active ? (
                          <button onClick={() => handleDisableSubdomain(c.id)} disabled={actionId === c.id}
                            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50 disabled:opacity-40">
                            <GlobeLock className="w-3.5 h-3.5" />
                            {actionId === c.id ? '...' : t('disableSubdomain')}
                          </button>
                        ) : (
                          <button onClick={() => handleEnableSubdomain(c.id)} disabled={actionId === c.id}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-40">
                            <Globe className="w-3.5 h-3.5" />
                            {actionId === c.id ? '...' : t('enableSubdomain')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="w-56 shrink-0 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">Module Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total',    value: summary.total },
                { label: 'Filtered', value: filtered.length },
                { label: 'Pending',  value: summary.pending },
                { label: 'Expiring', value: summary.expiring },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`font-bold mt-0.5 text-xl text-gray-900 ${item.label === 'Expiring' && item.value > 0 ? 'text-amber-600' : ''}`}>
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
                { label: 'Active / Healthy',  count: summary.active,    color: 'bg-green-50 text-green-700 border-green-200' },
                { label: 'Needs attention',   count: summary.pending,   color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: 'Suspended',         count: summary.suspended, color: 'bg-red-50 text-red-700 border-red-200' },
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

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 mb-3">Subdomain Health</h3>
            <div className="space-y-2">
              {[
                { label: 'Subdomains active',   count: clinics.filter((c) => c.subdomain_active).length,  color: 'text-green-700' },
                { label: 'Subdomains disabled', count: clinics.filter((c) => !c.subdomain_active).length, color: 'text-red-600' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
