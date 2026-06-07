import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, X, Eye, Download, Clock, Users,
  Activity, CheckCircle, RefreshCw, Loader2,
  CalendarDays, List, LayoutGrid, ChevronRight, Stethoscope,
  Play,
} from 'lucide-react';
import {
  getAppointments,
  getTodayAppointments,
  updateAppointmentStatus,
  exportAppointments,
  getDentistQueue,
  callNextPatient,
} from '../../services/dentistService';
import ReferralModal from '../../components/dentist/ReferralModal';
import ProcedureModal from '../../components/dentist/ProcedureModal';

const STATUS_FILTERS = [
  'All','pending','confirmed','checked_in',
  'in_progress','treatment_started','completed','no_show','cancelled',
];

const statusColors = {
  pending:           'bg-amber-100 text-amber-700',
  confirmed:         'bg-blue-100 text-blue-700',
  checked_in:        'bg-teal-100 text-teal-700',
  in_progress:       'bg-purple-100 text-purple-700',
  treatment_started: 'bg-cyan-100 text-cyan-700',
  completed:         'bg-green-100 text-green-700',
  no_show:           'bg-red-100 text-red-700',
  cancelled:         'bg-gray-100 text-gray-500',
};

const statusLabels = {
  pending:           'Pending',
  confirmed:         'Confirmed',
  checked_in:        'Checked In',
  in_progress:       'In Progress',
  treatment_started: 'Treatment Started',
  completed:         'Completed',
  no_show:           'No Show',
  cancelled:         'Cancelled',
};

const queueStatusColors = {
  waiting:     'bg-amber-100 text-amber-700 border border-amber-200',
  in_progress: 'bg-purple-100 text-purple-700 border border-purple-200',
  done:        'bg-green-100 text-green-700 border border-green-200',
  emergency:   'bg-red-100 text-red-700 border border-red-200',
};

const metrics = [
  { label: 'Pending',     key: 'pending',     icon: Clock,       iconBg: 'bg-amber-50',  iconColor: 'text-amber-500'  },
  { label: 'Checked In',  key: 'checked_in',  icon: Users,       iconBg: 'bg-teal-50',   iconColor: 'text-teal-500'   },
  { label: 'In Progress', key: 'in_progress', icon: Activity,    iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
  { label: 'Completed',   key: 'completed',   icon: CheckCircle, iconBg: 'bg-green-50',  iconColor: 'text-green-500'  },
];

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
      type === 'error' ? 'bg-red-500' : 'bg-gray-900'
    }`}>{message}</div>
  );
}

function DetailModal({ appointment, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <p className="text-xs text-gray-400 font-mono">APT-{String(appointment.id).padStart(4, '0')}</p>
            <h3 className="text-base font-bold text-gray-900">{appointment.patient_name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Date',      value: appointment.date },
              { label: 'Time',      value: appointment.time_ett ? `${appointment.time_ett} (${appointment.time})` : '—' },
              { label: 'Type',      value: appointment.type },
              { label: 'Duration',  value: `${appointment.duration_minutes} min` },
              { label: 'Phone',     value: appointment.patient_phone },
              { label: 'Booked by', value: appointment.created_by_name },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[appointment.status]}`}>
                {statusLabels[appointment.status]}
              </span>
            </div>
          </div>
          {appointment.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ appointment, onClose, onReschedule }) {
  const [newDateTime, setNewDateTime] = useState('');
  const [loading, setLoading]         = useState(false);
  const handleSubmit = async () => {
    if (!newDateTime) return;
    setLoading(true);
    await onReschedule(appointment.id, newDateTime);
    setLoading(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Reschedule Appointment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Patient: <span className="font-semibold">{appointment?.patient_name}</span></p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Date & Time</label>
            <input type="datetime-local" value={newDateTime} onChange={(e) => setNewDateTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!newDateTime || loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Scheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyAppointments() {
  const [appointments,   setAppointments]   = useState([]);
  const [todayMeta,      setTodayMeta]      = useState({});
  const [queue,          setQueue]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [queueLoading,   setQueueLoading]   = useState(false);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [dateFilter,     setDateFilter]     = useState('');
  const [activeTab,      setActiveTab]      = useState('list');
  const [actionLoading,  setActionLoading]  = useState(null);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [detailAppt,     setDetailAppt]     = useState(null);
  const [referralModal,  setReferralModal]  = useState(null);
  const [procedureModal, setProcedureModal] = useState(null);
  const [toast,          setToast]          = useState(null);
  const [pagination,     setPagination]     = useState({ current_page: 1, last_page: 1, total: 0 });
  const [showQueue,      setShowQueue]      = useState(true);
  const pollingRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const loadAppointments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page, per_page: 15,
        ...(statusFilter !== 'All' && { status: statusFilter }),
        ...(dateFilter && { date: dateFilter }),
        ...(search     && { search }),
      };
      const response = await getAppointments(params);
      setAppointments(response.data || []);
      setPagination({
        current_page: response.meta?.current_page || 1,
        last_page:    response.meta?.last_page    || 1,
        total:        response.meta?.total        || 0,
      });
    } catch { showToast('Failed to load appointments.', 'error'); }
    finally  { setLoading(false); }
  }, [statusFilter, dateFilter, search, showToast]);

  const loadToday = useCallback(async () => {
    try { const res = await getTodayAppointments(); setTodayMeta(res.meta || {}); } catch { /* silent */ }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      setQueueLoading(true);
      const res = await getDentistQueue();
      setQueue(res.data?.queue ?? res.queue ?? []);
    } catch { /* silent */ }
    finally { setQueueLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { loadAppointments(); loadToday(); loadQueue(); }, 0);
    return () => clearTimeout(timer);
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    pollingRef.current = setInterval(() => { loadQueue(); loadToday(); }, 30000);
    return () => clearInterval(pollingRef.current);
  }, [loadQueue, loadToday]);

  const handleStatusUpdate = async (id, newStatus, newDateTime = null) => {
    setActionLoading(id);
    try {
      await updateAppointmentStatus(id, {
        status: newStatus,
        ...(newDateTime && { new_datetime: newDateTime }),
      });
      showToast(`Appointment ${newDateTime ? 'rescheduled' : `updated to ${statusLabels[newStatus]}`}.`);
      loadAppointments(pagination.current_page);
      loadToday();
      loadQueue();
    } catch { showToast('Failed to update appointment.', 'error'); }
    finally  { setActionLoading(null); }
  };

  const handleReschedule = (id, newDateTime) => handleStatusUpdate(id, 'cancelled', newDateTime);

  const handleCallNext = async () => {
    try {
      const res = await callNextPatient();
      showToast(res.message || 'Next patient called.');
      loadQueue();
      loadAppointments(pagination.current_page);
    } catch (err) {
      showToast(err?.response?.data?.message || 'No patients waiting.', 'error');
    }
  };

  const handleExport = async () => {
    try { await exportAppointments(); showToast('Export started.'); }
    catch { showToast('Failed to export.', 'error'); }
  };

  const canRefer = (status) => !['completed', 'cancelled', 'no_show'].includes(status);

  // ── NEW TREATMENT FLOW ────────────────────────────────────────────────────
  // in_progress:
  //   - invoice NOT paid → show "Add Procedure" only
  //   - invoice paid     → show "Start Treatment" + "Add Procedure"
  // treatment_started:
  //   - show "Complete" + "Add Procedure"
  // ─────────────────────────────────────────────────────────────────────────
  const getActionButtons = (appt) => {
    const busy = actionLoading === appt.id;

    const AddProcedureBtn = (
      <button
        onClick={() => setProcedureModal(appt)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-300 text-green-600 text-xs font-semibold hover:bg-green-50 transition-colors"
      >
        <Stethoscope className="w-3 h-3" /> Add Procedure
      </button>
    );

    switch (appt.status) {
      case 'pending':
        return (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleStatusUpdate(appt.id, 'confirmed')} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-50">Confirm</button>
            <button onClick={() => handleStatusUpdate(appt.id, 'cancelled')} disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-red-300 text-red-500 text-xs font-semibold hover:bg-red-50 disabled:opacity-50">Cancel</button>
          </div>
        );

      case 'confirmed':
        return (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleStatusUpdate(appt.id, 'checked_in')} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 disabled:opacity-50">Check In</button>
            <button onClick={() => setRescheduleAppt(appt)} disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50">Reschedule</button>
          </div>
        );

      case 'checked_in':
        return (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleStatusUpdate(appt.id, 'in_progress')} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 disabled:opacity-50">Start</button>
            {AddProcedureBtn}
            <button onClick={() => handleStatusUpdate(appt.id, 'no_show')} disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-red-300 text-red-500 text-xs font-semibold hover:bg-red-50 disabled:opacity-50">No Show</button>
          </div>
        );

      case 'in_progress':
        // invoice_paid comes from backend formatAppointment
        return (
          <div className="flex gap-2 flex-wrap">
            {appt.invoice_paid === true ? (
              // Invoice paid → show "Start Treatment"
              <button
                onClick={() => handleStatusUpdate(appt.id, 'treatment_started')}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-600 disabled:opacity-50"
              >
                <Play className="w-3 h-3" /> Start Treatment
              </button>
            ) : (
              // Invoice NOT paid → only Add Procedure
              <span className="text-[10px] text-gray-400 py-1">
                Waiting for payment…
              </span>
            )}
            {AddProcedureBtn}
          </div>
        );

      case 'treatment_started':
        return (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleStatusUpdate(appt.id, 'completed')} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-50">
              Complete
            </button>
            {AddProcedureBtn}
          </div>
        );

      default:
        return null;
    }
  };

  const statusCounts = {
    pending:     todayMeta.pending     ?? 0,
    checked_in:  todayMeta.checked_in  ?? 0,
    in_progress: todayMeta.in_progress ?? 0,
    completed:   todayMeta.completed   ?? 0,
  };

  const activeQueueItems = queue.filter((q) => ['waiting', 'in_progress'].includes(q.status));
  const waitingCount     = queue.filter((q) => q.status === 'waiting').length;
  const inProgressCount  = queue.filter((q) => q.status === 'in_progress').length;

  return (
    <div className="space-y-6 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {rescheduleAppt && (
        <RescheduleModal appointment={rescheduleAppt} onClose={() => setRescheduleAppt(null)} onReschedule={handleReschedule} />
      )}
      {detailAppt && <DetailModal appointment={detailAppt} onClose={() => setDetailAppt(null)} />}
      {referralModal && (
        <ReferralModal appointment={referralModal} onClose={() => setReferralModal(null)}
          onSuccess={() => { loadAppointments(pagination.current_page); loadToday(); loadQueue(); }} />
      )}
      {procedureModal && (
        <ProcedureModal appointment={procedureModal} onClose={() => setProcedureModal(null)}
          onSuccess={() => {
            showToast('Procedure added and invoice updated!');
            loadAppointments(pagination.current_page);
            loadToday();
            loadQueue();
          }} />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Dentist Workspace</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-sm text-gray-500 mt-1">Your schedule, live queue, and appointment workflow.</p>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon  = metric.icon;
          const count = statusCounts[metric.key] ?? 0;
          return (
            <div key={metric.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Queue */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div onClick={() => setShowQueue(!showQueue)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-gray-900">Live Queue</h2>
              <p className="text-xs text-gray-400 mt-0.5">{waitingCount} waiting · {inProgressCount} in progress</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {waitingCount > 0 && (
              <button onClick={(e) => { e.stopPropagation(); handleCallNext(); }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                Call Next
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); loadQueue(); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showQueue ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {showQueue && (
          <>
            {queueLoading ? (
              <div className="flex justify-center py-8 border-t border-gray-100">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : activeQueueItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-t border-gray-100">
                No patients in queue right now.
              </div>
            ) : (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {activeQueueItems.map((item) => (
                  <div key={item.id} className={`flex items-center gap-4 px-6 py-3 ${
                    item.status === 'in_progress' ? 'bg-purple-50/40' : ''
                  } ${item.priority === 'emergency' ? 'bg-red-50/40' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      item.priority === 'emergency' ? 'bg-red-500 text-white' :
                      item.status === 'in_progress' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {item.priority === 'emergency' ? '!' : `#${item.position ?? item.queue_position ?? '—'}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.patient_name}</p>
                      <p className="text-xs text-gray-400">
                        {item.appointment_type || item.type || 'Walk-in'}
                        {item.wait_minutes ? ` · ${item.wait_minutes} min wait` : ''}
                      </p>
                      {item.notes && <p className="text-xs text-amber-600 mt-0.5 truncate">{item.notes}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      item.priority === 'emergency' ? queueStatusColors.emergency :
                      queueStatusColors[item.status] ?? 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.priority === 'emergency' ? 'EMERGENCY' :
                       item.status === 'in_progress' ? 'In Progress' : 'Waiting'}
                    </span>

                    {/* Queue panel: only "Add Procedure" when in_progress — no Start/Complete here */}
                    {item.status === 'waiting' && item.appointment_id && (
                      <button onClick={() => handleStatusUpdate(item.appointment_id, 'in_progress')}
                        className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-[10px] font-bold hover:bg-purple-600 transition-colors shrink-0">
                        Start
                      </button>
                    )}
                    {/* in_progress queue item: no Complete button here, handled in appointments list */}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by patient name..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadAppointments(1)}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
          <button onClick={() => loadAppointments(1)} className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200">Search</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none">
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : statusLabels[s]}</option>
            ))}
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 outline-none" />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="p-2 rounded-xl text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['list', 'List'], ['cards', 'Cards']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab === 'list' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}

      {/* Table view */}
      {!loading && activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['DATE & TIME (EAT)', 'PATIENT', 'TYPE', 'DURATION', 'STATUS', 'ACTIONS', 'REFER', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">No appointments found.</td></tr>
                ) : appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{appt.date}</p>
                      <p className="text-xs text-blue-600 font-semibold">{appt.time_ett || appt.time} <span className="text-gray-400 font-normal">({appt.time})</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{appt.patient_name}</p>
                      <p className="text-xs text-gray-400">{appt.patient_phone}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{appt.type}</td>
                    <td className="px-6 py-4 text-gray-600">{appt.duration_minutes} min</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[appt.status]}`}>
                        {statusLabels[appt.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getActionButtons(appt)}</td>
                    <td className="px-6 py-4">
                      {canRefer(appt.status) && (
                        <button onClick={() => setReferralModal(appt)}
                          className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors">
                          Refer
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setDetailAppt(appt)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing {appointments.length} of {pagination.total} records</p>
              <div className="flex gap-2">
                {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => loadAppointments(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                      pagination.current_page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards view */}
      {!loading && activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400 text-sm">No appointments found.</div>
          ) : appointments.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 font-mono">APT-{String(appt.id).padStart(4, '0')}</p>
                  <p className="text-base font-bold text-gray-900">{appt.patient_name}</p>
                  <p className="text-xs text-gray-500">{appt.type}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[appt.status]}`}>
                  {statusLabels[appt.status]}
                </span>
              </div>
              <div className="space-y-1.5 mb-4">
                {[
                  { label: 'Date',     value: `${appt.date}` },
                  { label: 'Time',     value: `${appt.time_ett || appt.time} (${appt.time})` },
                  { label: 'Duration', value: `${appt.duration_minutes} min` },
                  { label: 'Phone',    value: appt.patient_phone },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-between">
                <div className="flex gap-2 flex-wrap">
                  {getActionButtons(appt)}
                  {canRefer(appt.status) && (
                    <button onClick={() => setReferralModal(appt)}
                      className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors">
                      Refer
                    </button>
                  )}
                </div>
                <button onClick={() => setDetailAppt(appt)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}