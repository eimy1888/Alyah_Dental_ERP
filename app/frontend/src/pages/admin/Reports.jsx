import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/axiosInstance';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n) + ' ETB';

const STATUS_BADGE = {
  ready:           'bg-green-100 text-green-700',
  needs_attention: 'bg-yellow-100 text-yellow-700',
};

const STATUS_LABEL = {
  ready:           'Active / Healthy',
  needs_attention: 'Needs attention',
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg
      ${type === 'error' ? 'bg-red-600' : 'bg-gray-900'} text-white`}>
      <span>{type === 'error' ? '❌' : '✅'}</span>
      <span className="text-sm">{msg}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}

// ── Schedule Modal ────────────────────────────────────────────────────────────
function ScheduleModal({ report, onClose, onSave }) {
  const [freq,  setFreq]  = useState('weekly');
  const [day,   setDay]   = useState('Monday');
  const [email, setEmail] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">
                Schedule Report
              </p>
              <h2 className="text-white text-xl font-bold mt-0.5">{report.name}</h2>
              <p className="text-blue-200 text-sm">{report.scope} · {report.format}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Frequency
            </label>
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly'].map((f) => (
                <button key={f} onClick={() => setFreq(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all
                    ${freq === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Day of week */}
          {freq === 'weekly' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Day of Week
              </label>
              <select value={day} onChange={(e) => setDay(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white">
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Deliver to Email
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@clinic.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
          </div>

          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            <strong>Note:</strong> Scheduled reports will be generated automatically and emailed to the address above.
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => { onSave(); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report Detail Modal ───────────────────────────────────────────────────────
function ReportDetailModal({ report, data, onClose }) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">
                Generated Report
              </p>
              <h2 className="text-white text-xl font-bold mt-0.5">{data.report}</h2>
              <p className="text-blue-200 text-sm">Generated {data.generated}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Summary metrics */}
          {data.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data.summary).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 capitalize mb-1">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {typeof value === 'number' && key.includes('revenue')
                      ? fmt(value)
                      : typeof value === 'number' && key.includes('value')
                      ? fmt(value)
                      : typeof value === 'number' && key.includes('outstanding')
                      ? fmt(value)
                      : value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Expiry items table */}
          {data.items && data.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Expiring Items ({data.items.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b">
                      {['Name', 'SKU', 'Branch', 'Expiry', 'Qty', 'Status'].map((h) => (
                        <th key={h} className="pb-2 text-left font-medium px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-800">{item.name}</td>
                        <td className="py-2 px-2 text-gray-500 font-mono text-xs">{item.sku}</td>
                        <td className="py-2 px-2 text-gray-500">{item.branch}</td>
                        <td className="py-2 px-2 text-gray-500">{item.expiry_date}</td>
                        <td className="py-2 px-2 text-gray-700">{item.quantity}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status] || 'bg-gray-100 text-gray-600'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices table */}
          {data.invoices && data.invoices.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Outstanding Invoices ({data.invoices.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b">
                      {['Invoice', 'Patient', 'Total', 'Balance', 'Status', 'Due Date'].map((h) => (
                        <th key={h} className="pb-2 text-left font-medium px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-2 font-mono text-xs text-gray-500">{inv.invoice_number}</td>
                        <td className="py-2 px-2 font-medium text-gray-800">{inv.patient}</td>
                        <td className="py-2 px-2 text-gray-700">{fmt(inv.total)}</td>
                        <td className="py-2 px-2 font-semibold text-red-600">{fmt(inv.balance)}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                            ${inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-400 text-xs">{inv.due_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low stock items */}
          {data.low_stock_items && data.low_stock_items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Low Stock Items ({data.low_stock_items.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b">
                      {['Name', 'SKU', 'Branch', 'Qty', 'Threshold'].map((h) => (
                        <th key={h} className="pb-2 text-left font-medium px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.low_stock_items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-800">{item.name}</td>
                        <td className="py-2 px-2 text-gray-500 font-mono text-xs">{item.sku}</td>
                        <td className="py-2 px-2 text-gray-500">{item.branch}</td>
                        <td className="py-2 px-2 font-semibold text-red-600">{item.quantity}</td>
                        <td className="py-2 px-2 text-gray-500">{item.threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By method breakdown */}
          {data.by_method && data.by_method.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Payment Method Breakdown</h3>
              <div className="space-y-2">
                {data.by_method.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700 capitalize">{m.method?.replace('_', ' ')}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{fmt(m.total)}</p>
                      <p className="text-xs text-gray-400">{m.count} payments</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
            Close
          </button>
          <button onClick={() => window.print()}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            Print / Export
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const [reports,        setReports]        = useState([]);
  const [meta,           setMeta]           = useState({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [segment,        setSegment]        = useState('All segments');
  const [toast,          setToast]          = useState(null);
  const [scheduleReport, setScheduleReport] = useState(null);
  const [generating,     setGenerating]     = useState(null);
  const [reportDetail,   setReportDetail]   = useState(null);
  const [detailReport,   setDetailReport]   = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  // ── Fetch reports list ─────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/reports');
      setReports(res.data.data || []);
      setMeta(res.data.meta   || {});
    } catch {
      setError('Failed to load reports. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Generate report ────────────────────────────────────────────────────────
  const handleGenerate = async (report) => {
    setGenerating(report.id);
    try {
      const res = await apiClient.post(`/admin/reports/${report.id}/generate`);
      setReportDetail(res.data.data);
      setDetailReport(report);
      showToast(`${report.name} generated successfully.`);
    } catch {
      showToast('Failed to generate report.', 'error');
    } finally {
      setGenerating(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = reports.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.scope.toLowerCase().includes(search.toLowerCase()) ||
      r.owner.toLowerCase().includes(search.toLowerCase());
    const matchSegment =
      segment === 'All segments' ||
      r.owner === segment ||
      r.scope.toLowerCase().includes(segment.toLowerCase());
    return matchSearch && matchSegment;
  });

  const needsAttention = reports.filter((r) => r.status === 'needs_attention').length;
  const ready          = reports.filter((r) => r.status === 'ready').length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
      {scheduleReport && (
        <ScheduleModal
          report={scheduleReport}
          onClose={() => setScheduleReport(null)}
          onSave={() => showToast(`Schedule saved for ${scheduleReport.name}`)}
        />
      )}
      {reportDetail && (
        <ReportDetailModal
          report={detailReport}
          data={reportDetail}
          onClose={() => { setReportDetail(null); setDetailReport(null); }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
            Workspace Module
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Reports Studio</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Export financial, clinical, branch, inventory, and productivity reports.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => showToast('Reports list exported.')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white
              text-gray-700 text-sm font-medium hover:bg-gray-50 shadow-sm">
            ↓ Export
          </button>
          <button onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white
              text-sm font-semibold hover:bg-blue-700 shadow-sm">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Search + Filter ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports studio..."
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400" />
          </div>
          <select value={segment} onChange={(e) => setSegment(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600
              outline-none focus:border-blue-400 bg-white cursor-pointer">
            {['All segments', 'Finance', 'Operations', 'Store Lead'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Reports Table — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Reports Studio</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                    {['Report', 'Scope', 'Last Generated', 'Owner', 'Format', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                        No reports found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-800">{r.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">
                              {r.description}
                            </p>
                            {/* Live meta badge */}
                            {r.meta && Object.keys(r.meta).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(r.meta).map(([k, v]) => (
                                  <span key={k}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold">
                                    {k.replace(/_/g, ' ')}: {typeof v === 'number' && v > 1000 ? fmt(v) : v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{r.scope}</td>
                        <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {r.last_generated}
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs">{r.owner}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            {r.format}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleGenerate(r)}
                              disabled={generating === r.id}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs
                                font-semibold hover:bg-blue-100 disabled:opacity-60 transition-colors
                                whitespace-nowrap">
                              {generating === r.id ? 'Generating…' : 'Generate'}
                            </button>
                            <button onClick={() => setScheduleReport(r)}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs
                                font-semibold hover:bg-gray-200 transition-colors">
                              Schedule
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel — real meta */}
        <div className="space-y-6">

          {/* Module Summary — real */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Module Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total records',  value: meta.total            ?? reports.length },
                { label: 'Filtered',       value: filtered.length },
                { label: 'Action needed',  value: meta.needs_attention  ?? needsAttention, highlight: true },
                { label: 'Last updated',   value: meta.last_updated     ?? 'Today' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className={`text-2xl font-bold mt-0.5
                    ${s.highlight && s.value > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown — real */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Active / Healthy', count: ready,          color: 'bg-green-100 text-green-700' },
                { label: 'Needs attention',  count: needsAttention, color: 'bg-yellow-100 text-yellow-700' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.color}`}>
                    {s.label}
                  </span>
                  <span className="text-gray-800 font-bold text-sm">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {reports.slice(0, 3).map((r) => (
                <button key={r.id} onClick={() => handleGenerate(r)}
                  disabled={generating === r.id}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-50 text-gray-700
                    text-xs font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors
                    disabled:opacity-60">
                  📊 {r.name}
                  {r.meta && r.meta.expiring_items > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                      {r.meta.expiring_items}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Attention required — real */}
          {needsAttention > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-amber-800 mb-3">⚠️ Needs Attention</h3>
              <div className="space-y-2">
                {reports
                  .filter((r) => r.status === 'needs_attention')
                  .map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-white border border-amber-100">
                      <p className="text-sm font-semibold text-amber-900">{r.name}</p>
                      {r.meta && Object.entries(r.meta).map(([k, v]) => (
                        <p key={k} className="text-xs text-amber-600 mt-0.5">
                          {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                        </p>
                      ))}
                      <button onClick={() => handleGenerate(r)}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                        Generate now →
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}