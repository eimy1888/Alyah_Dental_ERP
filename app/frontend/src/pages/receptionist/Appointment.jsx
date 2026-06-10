import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Loader2, CalendarDays,
  LayoutGrid, List, Trash2, Coffee,
} from 'lucide-react';
import {
  getAppointments, updateAppointment,
  updateAppointmentStatus, deleteAppointment,
  getAvailability, checkInAppointment,
} from '../../services/receptionistService';
import AppointmentRegistrationModal from '../../components/appointment/AppointmentRegistrationModal';
import { getEthiopianDate, toEthiopianTime } from '../../lib/utils';

const statusColors = {
  pending:           'bg-amber-50 text-amber-700 border border-amber-200',
  confirmed:         'bg-blue-50 text-blue-700 border border-blue-200',
  checked_in:        'bg-purple-50 text-purple-700 border border-purple-200',
  in_progress:       'bg-indigo-50 text-indigo-700 border border-indigo-200',
  treatment_started: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  completed:         'bg-green-50 text-green-700 border border-green-200',
  no_show:           'bg-red-50 text-red-700 border border-red-200',
  cancelled:         'bg-gray-100 text-gray-500 border border-gray-200',
};

const statusLabel = {
  pending:           'Pending',
  confirmed:         'Confirmed',
  checked_in:        'Checked In',
  in_progress:       'In Progress',
  treatment_started: 'Treatment Started',
  completed:         'Completed',
  no_show:           'No Show',
  cancelled:         'Cancelled',
};

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
      type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-gray-900'
    }`}>{msg}</div>
  );
}

// ── Grid component ──────────────────────────────────────────────────
function ContinuousGrid({ availability, onSlotClick, isPastDate }) {
  if (!availability?.dentists?.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        {isPastDate ? 'No appointments found for this date.' : 'No dentists available for this date.'}
      </div>
    );
  }

  const dentists = availability.dentists;

  const buildSharedTimePoints = () => {
    const events = new Set();
    dentists.forEach((d) => {
      const mh = d.working_hours?.morning;
      const ah = d.working_hours?.afternoon;
      if (mh?.enabled) { events.add(mh.start); events.add(mh.end); }
      if (ah?.enabled) { events.add(ah.start); events.add(ah.end); }
      (d.booked_slots ?? []).forEach((s) => {
        events.add(s.time);
        events.add(s.end_time);
      });
    });
    return Array.from(events).sort();
  };

  const timePoints = buildSharedTimePoints();
  const sharedRows = [];
  for (let i = 0; i < timePoints.length - 1; i++) {
    const start = timePoints[i];
    const end   = timePoints[i + 1];
    const isLunch = dentists.some((d) => {
      const mh = d.working_hours?.morning;
      const ah = d.working_hours?.afternoon;
      return mh?.enabled && ah?.enabled && start === mh.end && end === ah.start;
    });
    sharedRows.push({ start, end, isLunch });
  }

  const buildDentistCells = (dentist) => {
    if (isPastDate && dentist.booked_slots?.length === 0) {
      return { type: 'no_appointments' };
    }
    const mh = dentist.working_hours?.morning;
    const ah = dentist.working_hours?.afternoon;
    const cells = [];
    let i = 0;

    while (i < sharedRows.length) {
      const { start: rowStart, end: rowEnd, isLunch } = sharedRows[i];

      if (isLunch) { 
        cells.push({ type: 'lunch', rowStart, span: 1 }); 
        i++; 
        continue; 
      }

      const inMorning   = mh?.enabled && rowStart >= mh.start && rowEnd <= mh.end;
      const inAfternoon = ah?.enabled && rowStart >= ah.start && rowEnd <= ah.end;
      if (!inMorning && !inAfternoon) { 
        cells.push({ type: 'outside', rowStart, span: 1 }); 
        i++; 
        continue; 
      }

      const booked = (dentist.booked_slots ?? []).find((s) => s.time === rowStart);
      if (booked) {
        let span = 0, j = i;
        while (j < sharedRows.length && sharedRows[j].start < booked.end_time) { 
          span++; 
          j++; 
        }
        span = Math.max(span, 1);
        cells.push({ type: 'booked', rowStart, span, ...booked });
        for (let k = 1; k < span; k++) {
          cells.push({ type: 'skip', rowStart: sharedRows[i + k]?.start });
        }
        i += span; 
        continue;
      }

      const covered = (dentist.booked_slots ?? []).find((s) => s.time < rowStart && s.end_time > rowStart);
      if (covered) { 
        cells.push({ type: 'skip', rowStart }); 
        i++; 
        continue; 
      }

      if (isPastDate) { 
        cells.push({ type: 'no_free', rowStart, span: 1 }); 
        i++; 
        continue; 
      }

      let span = 1, j = i + 1;
      while (j < sharedRows.length) {
        const next = sharedRows[j];
        if (next.isLunch) break;
        const nextInMorn = mh?.enabled && next.start >= mh.start && next.end <= mh.end;
        const nextInAftn = ah?.enabled && next.start >= ah.start && next.end <= ah.end;
        if (!nextInMorn && !nextInAftn) break;
        if ((dentist.booked_slots ?? []).find((s) => s.time === next.start)) break;
        if ((dentist.booked_slots ?? []).find((s) => s.time < next.start && s.end_time > next.start)) break;
        span++; 
        j++;
      }

      cells.push({ 
        type: 'free', 
        rowStart, 
        freeEnd: sharedRows[i + span - 1]?.end ?? rowEnd, 
        span, 
        startTime: rowStart 
      });
      for (let k = 1; k < span; k++) {
        cells.push({ type: 'skip', rowStart: sharedRows[i + k]?.start });
      }
      i += span;
    }
    return cells;
  };

  const columnData = dentists.map((d) => {
    const cells = buildDentistCells(d);
    if (cells.type === 'no_appointments') {
      return { dentist: d, isNoAppointments: true };
    }
    const cellMap = cells.reduce((map, cell) => { 
      map[cell.rowStart] = cell; 
      return map; 
    }, {});
    return { dentist: d, cellMap, isNoAppointments: false };
  });

  const hasAnyAppointments = dentists.some(d => d.booked_slots?.length > 0);
  if (isPastDate && !hasAnyAppointments) {
    return <div className="text-center py-12 text-gray-400 text-sm">No appointments found for this date.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-bold tracking-widest text-gray-400 sticky left-0 bg-gray-50 z-10 w-36 min-w-[140px]">
              ሰዓት (ETT)
            </th>
            {dentists.map((d) => (
              <th key={d.id} className="px-3 py-3 text-center text-xs font-bold text-gray-600 min-w-[160px]">
                <div className="font-bold">{d.name}</div>
                <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                  {d.estimated_wait_minutes > 0 && !isPastDate ? `~${d.estimated_wait_minutes} min wait` : 'Available'}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sharedRows.map(({ start, end, isLunch }) => {
            if (isLunch) {
              return (
                <tr key={`lunch-${start}`} className="bg-orange-50/60 border-y border-orange-100">
                  <td className="px-4 py-2 sticky left-0 bg-orange-50 z-10 border-r border-orange-100">
                    <div className="flex items-center gap-1.5">
                      <Coffee className="w-3 h-3 text-orange-400" />
                      <span className="text-xs font-semibold text-orange-500">
                        {toEthiopianTime(start)} – {toEthiopianTime(end)}
                      </span>
                    </div>
                    <div className="text-[10px] text-orange-400 mt-0.5">የምሳ እረፍት · Lunch Break</div>
                  </td>
                  {dentists.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-center bg-orange-50/40">
                      <span className="text-[10px] text-orange-300">—</span>
                    </td>
                  ))}
                </tr>
              );
            }

            return (
              <tr key={`${start}-${end}`} className="border-b border-gray-100">
                <td className="px-4 py-2.5 sticky left-0 bg-white z-10 border-r border-gray-100">
                  <div className="text-xs font-bold text-gray-900">{toEthiopianTime(start)}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{toEthiopianTime(end, false)} →</div>
                </td>
                {columnData.map(({ dentist, cellMap, isNoAppointments }) => {
                  if (isNoAppointments) {
                    if (start === sharedRows[0]?.start) {
                      return (
                        <td key={dentist.id} rowSpan={sharedRows.length} className="px-3 py-8 text-center bg-gray-50 align-middle">
                          <span className="text-xs text-gray-400">No appointments for this day</span>
                        </td>
                      );
                    }
                    return null;
                  }
                  const cell = cellMap[start];
                  if (!cell || cell.type === 'skip') return null;
                  if (cell.type === 'outside') {
                    return (
                      <td key={dentist.id} className="px-3 py-2.5 bg-gray-50/20 border-b border-gray-100">
                        <span className="text-[10px] text-gray-200">—</span>
                      </td>
                      );
                  }
                  if (cell.type === 'no_free') {
                    return (
                      <td key={dentist.id} className="px-3 py-2.5 bg-gray-50 text-center">
                        <span className="text-[10px] text-gray-300">—</span>
                      </td>
                      );
                  }
                  if (cell.type === 'booked') {
                    return (
                      <td key={dentist.id} rowSpan={cell.span} className={`px-3 py-2.5 border border-blue-100 align-top ${
                        cell.status === 'in_progress' || cell.status === 'treatment_started' ? 'bg-yellow-50' :
                        cell.status === 'completed'   ? 'bg-green-50'  :
                        cell.status === 'checked_in'  ? 'bg-purple-50' : 'bg-blue-50'
                      }`}>
                        <div className="text-[11px] font-bold text-gray-800 truncate max-w-[130px]">{cell.patient_name}</div>
                        <div className="flex items-center justify-between mt-0.5 flex-wrap gap-1">
                          <span className="text-[10px] text-gray-400">{cell.duration} min</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[cell.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {statusLabel[cell.status] ?? cell.status}
                          </span>
                        </div>
                      </td>
                      );
                  }
                  if (cell.type === 'free') {
                    return (
                      <td key={dentist.id} rowSpan={cell.span}
                        onClick={() => onSlotClick(dentist.id, cell.startTime)}
                        className="px-3 py-2.5 bg-green-50 border border-green-100 hover:bg-green-100 cursor-pointer transition-colors group align-top">
                        <div className="text-[11px] text-green-700 font-bold group-hover:text-green-800">{toEthiopianTime(cell.startTime)}</div>
                        <div className="text-[10px] text-green-500 mt-0.5">{toEthiopianTime(cell.freeEnd, false)} →</div>
                      </td>
                      );
                  }
                  return (
                    <td key={dentist.id} className="px-3 py-2.5 bg-gray-50/20">
                      <span className="text-[10px] text-gray-200">—</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-100 bg-gray-50 flex-wrap">
        {[
          ['bg-green-50 border-green-200',   'Free'],
          ['bg-blue-50 border-blue-200',     'Confirmed'],
          ['bg-purple-50 border-purple-200', 'Checked In'],
          ['bg-yellow-50 border-yellow-300', 'In Progress'],
          ['bg-green-50 border-green-300',   'Completed'],
          ['bg-orange-50 border-orange-200', 'Lunch Break'],
        ].map(([cls, lbl]) => (
          <span key={lbl} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-3 h-3 rounded border ${cls}`} /> {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReceptionistAppointments() {
  const [appointments,    setAppointments]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [date,            setDate]            = useState(() => getEthiopianDate(0));
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [search,          setSearch]          = useState('');
  const [page,            setPage]            = useState(1);
  const [pagination,      setPagination]      = useState({ total: 0, current_page: 1, last_page: 1 });
  const [activeTab,       setActiveTab]       = useState('list');
  const [availability,    setAvailability]    = useState(null);
  const [gridLoading,     setGridLoading]     = useState(false);
  const [toast,           setToast]           = useState(null);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [gridPrefill,     setGridPrefill]     = useState(null);
  const [checkingIn,      setCheckingIn]      = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting,        setDeleting]        = useState(false);
  const [isPastDate,      setIsPastDate]      = useState(false);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date, page, per_page: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await getAppointments(params);

      let appointmentsData = [];
      if (res?.data) {
        if (Array.isArray(res.data)) {
          appointmentsData = res.data;
        } else if (Array.isArray(res.data.data)) {
          appointmentsData = res.data.data;
        } else if (Array.isArray(res.data.appointments)) {
          appointmentsData = res.data.appointments;
        }
      }

      setAppointments(appointmentsData);
      setPagination({
        total:        res?.meta?.total        || res?.data?.total        || appointmentsData.length,
        current_page: res?.meta?.current_page || res?.data?.current_page || page,
        last_page:    res?.meta?.last_page    || res?.data?.last_page    || 1,
      });
    } catch {
      showToast('Failed to load appointments.', 'error');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [date, statusFilter, search, page, showToast]);

  const loadAvailability = useCallback(async () => {
    try {
      setGridLoading(true);
      const data = await getAvailability({ date });
      setAvailability(data);
      const today = getEthiopianDate(0);
      setIsPastDate(date < today);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally { 
      setGridLoading(false); 
    }
  }, [date]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);
  useEffect(() => { if (activeTab === 'grid') loadAvailability(); }, [activeTab, date, loadAvailability]);

  const handleSaved = (data, warnings = []) => {
    loadAppointments();
    if (activeTab === 'grid') loadAvailability();
    if (warnings?.length > 0) showToast(warnings[0].message, 'warning');
    else showToast('Appointment booked successfully.');
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateAppointmentStatus(id, status);
      showToast(`Status updated to ${statusLabel[status]}.`);
      loadAppointments();
      if (activeTab === 'grid') loadAvailability();
    } catch (err) { 
      showToast('Failed to update status.', 'error'); 
    }
  };

  const handleCheckIn = async (id) => {
    setCheckingIn(true);
    try {
      await checkInAppointment(id);
      showToast('Patient checked in successfully.');
      loadAppointments();
      if (activeTab === 'grid') loadAvailability();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'NO_ACTIVE_CARD') {
        showToast(data?.message || 'Patient does not have an active clinic card. Cannot check in.', 'error');
      } else {
        showToast(data?.message || 'Check-in failed.', 'error');
      }
    } finally { 
      setCheckingIn(false); 
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await deleteAppointment(deleteConfirmId);
      showToast('Appointment cancelled.');
      setDeleteConfirmId(null);
      loadAppointments();
      if (activeTab === 'grid') loadAvailability();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to cancel.', 'error');
    } finally { 
      setDeleting(false); 
    }
  };

  const handleGridSlotClick = (dentistId, time) => {
    setGridPrefill({ 
      dentist_id: String(dentistId), 
      appointment_date: date, 
      appointment_time: time
    });
    setModalOpen(true);
  };

  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const todayStr = getEthiopianDate(0);

  const counts = {
    total:     appointmentsArray.length,
    today:     appointmentsArray.filter((a) => a?.date === todayStr).length,
    pending:   appointmentsArray.filter((a) => ['pending', 'confirmed'].includes(a?.status)).length,
    completed: appointmentsArray.filter((a) => a?.status === 'completed').length,
  };

  const isClosed = availability?.is_closed === true;

  // Show closed message for today if clinic is closed
  if (activeTab === 'grid' && isClosed && !isPastDate) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Receptionist</p>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
              <p className="text-sm text-gray-500 mt-1">Schedule and manage patient appointments.</p>
            </div>
            <button
              onClick={() => { setGridPrefill(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Appointment
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Coffee className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Clinic Closed</h3>
            <p className="text-sm text-gray-500">The clinic is closed for today. No more appointments can be booked.</p>
            <p className="text-xs text-gray-400 mt-2">Please select a different date to schedule appointments.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modalOpen && (
        <AppointmentRegistrationModal
          role="receptionist"
          prefill={gridPrefill}
          onClose={() => { setModalOpen(false); setGridPrefill(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Cancel Appointment</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to cancel this appointment?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm">No</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Receptionist</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500 mt-1">Schedule and manage patient appointments.</p>
          </div>
          <button
            onClick={() => { setGridPrefill(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: counts.total,     bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'Today',     value: counts.today,     bg: 'bg-indigo-50', color: 'text-indigo-600' },
          { label: 'Pending',   value: counts.pending,   bg: 'bg-amber-50',  color: 'text-amber-600' },
          { label: 'Completed', value: counts.completed, bg: 'bg-green-50',  color: 'text-green-600' },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['list', 'List'], ['grid', 'Schedule Grid']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab === 'list' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border rounded-xl focus:border-blue-400 outline-none" />
        </div>
        {activeTab === 'list' && (
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-xl bg-white outline-none">
              <option value="all">All Statuses</option>
              {Object.entries(statusLabel).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search patient..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent" />
            </div>
            <button
              onClick={() => { setDate(getEthiopianDate(0)); setStatusFilter('all'); setSearch(''); }}
              className="px-4 py-2 text-sm text-blue-600 font-medium"
            >Reset</button>
          </>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : appointmentsArray.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No appointments found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['ሰዓት (ETT)', 'PATIENT', 'DENTIST', 'TYPE', 'STATUS', 'ACTIONS'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointmentsArray.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          <p>{apt.time ? toEthiopianTime(apt.time) : (apt.time_ett || '—')}</p>
                          <p className="text-xs text-gray-400 font-normal">{apt.time ? toEthiopianTime(apt.time, false) : ''}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{apt.patient?.full_name || apt.patient_name || '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{apt.dentist?.name || apt.dentist_name || '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{apt.type}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[apt.status]}`}>
                            {statusLabel[apt.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {apt.status === 'pending' && (
                              <button onClick={() => handleStatusUpdate(apt.id, 'confirmed')}
                                className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600">
                                Confirm
                              </button>
                            )}
                            {apt.status === 'confirmed' && (
                              <>
                                <button onClick={() => handleCheckIn(apt.id)} disabled={checkingIn}
                                  className="px-3 py-1 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 disabled:opacity-50">
                                  Check In
                                </button>
                                <button onClick={() => handleStatusUpdate(apt.id, 'no_show')}
                                  className="px-3 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200">
                                  No Show
                                </button>
                              </>
                            )}
                            {!['completed', 'cancelled', 'no_show', 'in_progress', 'treatment_started'].includes(apt.status) && (
                              <button onClick={() => setDeleteConfirmId(apt.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.last_page > 1 && (
                <div className="flex justify-center gap-2 px-6 py-4 border-t border-gray-100">
                  {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm ${pagination.current_page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {activeTab === 'grid' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {gridLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : (
            <ContinuousGrid 
              availability={availability} 
              onSlotClick={handleGridSlotClick} 
              isPastDate={isPastDate} 
            />
          )}
        </div>
      )}
    </div>
  );
}