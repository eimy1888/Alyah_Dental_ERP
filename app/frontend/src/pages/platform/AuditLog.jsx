import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  ShieldCheck, CreditCard, Globe, GlobeLock, UserX, UserCheck,
  ClipboardList, Filter,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── API ────────────────────────────────────────────────────────────────────────
const getAuditLogs = (params = {}) =>
  apiClient.get('/platform/audit-logs', { params }).then((r) => r.data);

const getAuditLogEvents = () =>
  apiClient.get('/platform/audit-logs/events').then((r) => r.data);

// ── Helpers ────────────────────────────────────────────────────────────────────
const EVENT_ICONS = {
  'clinic.approved':          { icon: ShieldCheck,  color: 'text-green-600 bg-green-50' },
  'clinic.rejected':          { icon: UserX,        color: 'text-red-600 bg-red-50' },
  'clinic.suspended':         { icon: UserX,        color: 'text-red-600 bg-red-50' },
  'clinic.reactivated':       { icon: UserCheck,    color: 'text-green-600 bg-green-50' },
  'clinic.subdomain_disabled':{ icon: GlobeLock,    color: 'text-amber-600 bg-amber-50' },
  'clinic.subdomain_enabled': { icon: Globe,        color: 'text-blue-600 bg-blue-50' },
  'plan.assigned':            { icon: CreditCard,   color: 'text-blue-600 bg-blue-50' },
  'subscription.payment_recorded': { icon: CreditCard, color: 'text-green-600 bg-green-50' },
};

const EVENT_LABELS = {
  'clinic.approved':           'Clinic Approved',
  'clinic.rejected':           'Clinic Rejected',
  'clinic.suspended':          'Clinic Suspended',
  'clinic.reactivated':        'Clinic Reactivated',
  'clinic.subdomain_disabled': 'Subdomain Disabled',
  'clinic.subdomain_enabled':  'Subdomain Enabled',
  'plan.assigned':             'Plan Assigned',
  'subscription.payment_recorded': 'Payment Recorded',
};

const ROLE_COLORS = {
  platform_admin: 'bg-red-50 text-red-700 border-red-200',
  clinic_admin:   'bg-blue-50 text-blue-700 border-blue-200',
  system:         'bg-gray-100 text-gray-600 border-gray-200',
};

function EventIcon({ event }) {
  const cfg = EVENT_ICONS[event] ?? { icon: ClipboardList, color: 'text-gray-500 bg-gray-100' };
  const Icon = cfg.icon;
  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function DiffTable({ label, values }) {
  if (!values || Object.keys(values).length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        {Object.entries(values).map(([k, v]) => (
          <div key={k} className="flex items-start gap-3 px-3 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-[11px] font-mono text-gray-400 shrink-0 w-36 truncate">{k}</span>
            <span className="text-[11px] font-mono text-gray-800 break-all">
              {v === null ? <span className="italic text-gray-300">null</span> : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Log Row Detail drawer ──────────────────────────────────────────────────────
function LogDrawer({ log, onClose }) {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Audit Entry #{log.id}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          {/* Event */}
          <div className="flex items-center gap-3">
            <EventIcon event={log.event} />
            <div>
              <p className="font-bold text-gray-900">{EVENT_LABELS[log.event] ?? log.event}</p>
              <p className="text-gray-400">{log.event}</p>
            </div>
          </div>

          {/* Actor */}
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mb-1.5">Actor</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">{log.user_name}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${ROLE_COLORS[log.user_role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {log.user_role}
              </span>
            </div>
          </div>

          {/* Subject */}
          {log.subject_label && (
            <div>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mb-1.5">Subject</p>
              <p className="text-gray-800 font-semibold">{log.subject_label}</p>
              <p className="text-gray-400">{log.subject_type} #{log.subject_id}</p>
            </div>
          )}

          {/* Clinic */}
          {log.clinic_name && (
            <div>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mb-1.5">Clinic</p>
              <p className="text-gray-800 font-semibold">{log.clinic_name}</p>
            </div>
          )}

          {/* Timestamp + IP */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mb-1">Time</p>
              <p className="text-gray-700">{new Date(log.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mb-1">IP</p>
              <p className="text-gray-700 font-mono">{log.ip_address ?? '—'}</p>
            </div>
          </div>

          {/* Diffs */}
          <DiffTable label="Before" values={log.old_values} />
          <DiffTable label="After"  values={log.new_values} />
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function PlatformAuditLog() {
  const { t } = useTranslation('platform');
  const [logs,      setLogs]      = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [selected,  setSelected]  = useState(null);
  const [meta,      setMeta]      = useState({ total: 0, current_page: 1, last_page: 1, per_page: 50 });

  const [search,    setSearch]    = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [page,        setPage]        = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params = {
        page,
        per_page: 50,
        ...(search       ? { search }           : {}),
        ...(eventFilter  ? { event: eventFilter }: {}),
        ...(roleFilter   ? { user_role: roleFilter }: {}),
        ...(fromDate     ? { from: fromDate }    : {}),
        ...(toDate       ? { to: toDate }        : {}),
      };
      const res = await getAuditLogs(params);
      setLogs(res.data ?? []);
      setMeta(res.meta ?? { total: 0, current_page: 1, last_page: 1, per_page: 50 });
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, eventFilter, roleFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getAuditLogEvents().then((r) => setEvents(r.data ?? [])).catch(() => {});
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, eventFilter, roleFilter, fromDate, toDate]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 space-y-6">

      {selected && <LogDrawer log={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Platform Admin</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('auditLog')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Immutable record of all platform actions — plan assignments, approvals, subdomain controls, and payments.
          </p>
        </div>
        <button onClick={() => load()} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filters</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event, actor, clinic..."
              className="w-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none bg-transparent" />
          </div>
          {/* Event */}
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 outline-none">
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e} value={e}>{EVENT_LABELS[e] ?? e}</option>
            ))}
          </select>
          {/* Role */}
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 outline-none">
            <option value="">All roles</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="clinic_admin">Clinic Admin</option>
          </select>
          {/* Date range */}
          <div className="flex gap-1.5">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="flex-1 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 outline-none" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="flex-1 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 outline-none" />
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">{meta.total.toLocaleString()} total entries</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            No audit entries found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {['EVENT', 'ACTOR', 'CLINIC', 'SUBJECT', 'TIME', 'IP'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}
                  onClick={() => setSelected(selected?.id === log.id ? null : log)}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${selected?.id === log.id ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <EventIcon event={log.event} />
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{EVENT_LABELS[log.event] ?? log.event}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{log.event}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-gray-800">{log.user_name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[log.user_role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {log.user_role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-600">{log.clinic_name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-700">{log.subject_label ?? '—'}</p>
                    {log.subject_type && <p className="text-[10px] text-gray-400">{log.subject_type}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                  <td className="px-5 py-3.5 text-[11px] text-gray-400 font-mono">{log.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {meta.current_page} of {meta.last_page} · {meta.total.toLocaleString()} entries
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.current_page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={meta.current_page >= meta.last_page}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
