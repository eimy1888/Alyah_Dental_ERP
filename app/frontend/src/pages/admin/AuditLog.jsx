import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  ClipboardList, Filter, UserCog, Building2, Package,
  Settings, DollarSign, Trash2, Plus, Edit2,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── API ────────────────────────────────────────────────────────────────────────
const getAuditLogs = (params = {}) =>
  apiClient.get('/admin/audit-logs', { params }).then((r) => r.data);

const getAuditEvents = () =>
  apiClient.get('/admin/audit-logs/events').then((r) => r.data);

// ── Event config ───────────────────────────────────────────────────────────────
const EVENT_META = {
  'staff.created':           { icon: Plus,      color: 'text-green-600 bg-green-50',  label: 'Staff Added' },
  'staff.updated':           { icon: Edit2,     color: 'text-blue-600 bg-blue-50',    label: 'Staff Updated' },
  'staff.deleted':           { icon: Trash2,    color: 'text-red-600 bg-red-50',      label: 'Staff Removed' },
  'branch.created':          { icon: Plus,      color: 'text-green-600 bg-green-50',  label: 'Branch Created' },
  'branch.updated':          { icon: Edit2,     color: 'text-blue-600 bg-blue-50',    label: 'Branch Updated' },
  'branch.deleted':          { icon: Trash2,    color: 'text-red-600 bg-red-50',      label: 'Branch Deleted' },
  'service.created':         { icon: Plus,      color: 'text-green-600 bg-green-50',  label: 'Service Created' },
  'service.updated':         { icon: Edit2,     color: 'text-blue-600 bg-blue-50',    label: 'Service Updated' },
  'service.deleted':         { icon: Trash2,    color: 'text-red-600 bg-red-50',      label: 'Service Deleted' },
  'expense.created':         { icon: DollarSign,color: 'text-amber-600 bg-amber-50',  label: 'Expense Recorded' },
  'expense.deleted':         { icon: Trash2,    color: 'text-red-600 bg-red-50',      label: 'Expense Deleted' },
  'settings.clinic_updated': { icon: Settings,  color: 'text-purple-600 bg-purple-50',label: 'Settings Updated' },
  'inventory.adjusted':      { icon: Package,   color: 'text-teal-600 bg-teal-50',    label: 'Stock Adjusted' },
};

const DEFAULT_META = { icon: ClipboardList, color: 'text-gray-500 bg-gray-100', label: null };

function getEventMeta(event) {
  if (!event) return DEFAULT_META;
  const exact = EVENT_META[event];
  if (exact) return exact;
  // prefix match
  const prefix = Object.keys(EVENT_META).find((k) => event.startsWith(k.split('.')[0]));
  return prefix ? EVENT_META[prefix] : DEFAULT_META;
}

// ── Event Icon ────────────────────────────────────────────────────────────────
function EventIcon({ event }) {
  const { icon: Icon, color } = getEventMeta(event);
  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

// ── Diff table ────────────────────────────────────────────────────────────────
function DiffTable({ label, values }) {
  if (!values || Object.keys(values).length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        {Object.entries(values).map(([k, v]) => (
          <div key={k} className="flex items-start gap-3 px-3 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-[11px] font-mono text-gray-400 shrink-0 w-32 truncate">{k}</span>
            <span className="text-[11px] font-mono text-gray-800 break-all">
              {v === null || v === undefined
                ? <span className="italic text-gray-300">null</span>
                : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function LogDrawer({ log, onClose }) {
  if (!log) return null;
  const { label } = getEventMeta(log.event);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Entry #{log.id}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 text-xs flex-1">
          {/* Event */}
          <div className="flex items-center gap-3">
            <EventIcon event={log.event} />
            <div>
              <p className="font-bold text-gray-900 text-sm">{label ?? log.event}</p>
              <p className="text-gray-400 font-mono text-[10px]">{log.event}</p>
            </div>
          </div>

          {/* Actor */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performed By</p>
            <p className="font-semibold text-gray-800">{log.user_name}</p>
            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold capitalize">
              {log.user_role?.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Subject */}
          {log.subject_label && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Affected Record</p>
              <p className="font-semibold text-gray-800">{log.subject_label}</p>
              {log.subject_type && <p className="text-gray-400 text-[10px]">{log.subject_type} #{log.subject_id}</p>}
            </div>
          )}

          {/* Time + IP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time</p>
              <p className="text-gray-700">{new Date(log.created_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">IP Address</p>
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
export default function AdminAuditLog() {
  const [logs,       setLogs]       = useState([]);
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [selected,   setSelected]   = useState(null);
  const [meta,       setMeta]       = useState({ total: 0, current_page: 1, last_page: 1, per_page: 30 });

  const [search,     setSearch]     = useState('');
  const [eventFilter,setEventFilter]= useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [page,       setPage]       = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params = {
        page, per_page: 30,
        ...(search      ? { search }           : {}),
        ...(eventFilter ? { event: eventFilter }: {}),
        ...(fromDate    ? { from: fromDate }    : {}),
        ...(toDate      ? { to: toDate }        : {}),
      };
      const res = await getAuditLogs(params);
      setLogs(res.data ?? []);
      setMeta(res.meta ?? { total: 0, current_page: 1, last_page: 1, per_page: 30 });
    } catch {
      setError('Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  }, [page, search, eventFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getAuditEvents()
      .then((r) => setEvents(r.data ?? []))
      .catch(() => {});
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, eventFilter, fromDate, toDate]);

  const fmt = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">

      {selected && <LogDrawer log={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Clinic Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete history of all changes made in your clinic — staff, branches, services, expenses, and settings.
          </p>
        </div>
        <button onClick={load}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filters</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, user or record..."
              className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
          </div>
          {/* Event */}
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none">
            <option value="">All actions</option>
            {events.map((e) => (
              <option key={e} value={e}>{getEventMeta(e).label ?? e}</option>
            ))}
          </select>
          {/* Date range */}
          <div className="flex gap-1.5">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="flex-1 px-2 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 bg-white outline-none"
              title="From date" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="flex-1 px-2 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 bg-white outline-none"
              title="To date" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Activity History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{meta.total.toLocaleString()} total entries</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No audit entries found.</p>
            <p className="text-xs text-gray-300 mt-1">Actions like adding staff, creating branches, or updating services will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const { label } = getEventMeta(log.event);
              return (
                <div key={log.id}
                  onClick={() => setSelected(selected?.id === log.id ? null : log)}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors
                    ${selected?.id === log.id ? 'bg-blue-50/40' : ''}`}>

                  <EventIcon event={log.event} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">
                        {label ?? log.event}
                      </p>
                      {log.subject_label && (
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                          — {log.subject_label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">by <span className="font-medium text-gray-600">{log.user_name}</span></span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                        {log.user_role?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400 whitespace-nowrap">{fmt(log.created_at)}</p>
                    {log.ip_address && (
                      <p className="text-[10px] text-gray-300 font-mono mt-0.5">{log.ip_address}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {meta.current_page} of {meta.last_page} · {meta.total.toLocaleString()} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page >= meta.last_page}
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
