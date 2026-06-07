import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Loader2, CalendarDays,
  LayoutGrid, List, UserX, Coffee,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import { getAvailability, checkInAppointment } from '../../services/managerService';
import AppointmentRegistrationModal from '../../components/appointment/AppointmentRegistrationModal';
import DentistUnavailableModal from '../../components/manager/DentistUnavailableModal';
import { getEthiopianDate } from '../../lib/utils';

const statusColors = {
  pending:     'bg-amber-50 text-amber-700 border border-amber-200',
  confirmed:   'bg-blue-50 text-blue-700 border border-blue-200',
  checked_in:  'bg-purple-50 text-purple-700 border border-purple-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  treatment_started: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  completed:   'bg-green-50 text-green-700 border border-green-200',
  no_show:     'bg-red-50 text-red-700 border border-red-200',
  cancelled:   'bg-gray-100 text-gray-500 border border-gray-200',
};

const statusLabel = {
  pending:     'Pending',
  confirmed:   'Confirmed',
  checked_in:  'Checked In',
  in_progress: 'In Progress',
  treatment_started: 'Treatment Started',
  completed:   'Completed',
  no_show:     'No Show',
  cancelled:   'Cancelled',
};

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
      type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-gray-900'
    }`}>{msg}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContinuousGrid — rowSpan-based, each dentist column is independent
// Times are displayed directly (backend sends EAT)
// ─────────────────────────────────────────────────────────────────────────────
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

  const hasAnyAppointments = dentists.some(d => d.booked_slots?.length > 0);

  const buildDentistCells = (dentist) => {
    if (isPastDate && dentist.booked_slots?.length === 0) {
      return { type: 'no_appointments', message: 'No appointments for this day' };
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
        let span = 0;
        let j = i;
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

      const covered = (dentist.booked_slots ?? []).find(
        (s) => s.time < rowStart && s.end_time > rowStart
      );
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

      let span = 1;
      let j = i + 1;

      while (j < sharedRows.length) {
        const next = sharedRows[j];
        if (next.isLunch) break;
        const nextInMorn = mh?.enabled && next.start >= mh.start && next.end <= mh.end;
        const nextInAftn = ah?.enabled && next.start >= ah.start && next.end <= ah.end;
        if (!nextInMorn && !nextInAftn) break;
        const nextBooked = (dentist.booked_slots ?? []).find((s) => s.time === next.start);
        if (nextBooked) break;
        const nextCovered = (dentist.booked_slots ?? []).find(
          (s) => s.time < next.start && s.end_time > next.start
        );
        if (nextCovered) break;
        span++;
        j++;
      }

      const freeEnd = sharedRows[i + span - 1]?.end ?? rowEnd;
      cells.push({ type: 'free', rowStart, freeEnd, span, startTime: rowStart });

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
      return { dentist: d, isNoAppointments: true, message: cells.message };
    }
    const cellMap = cells.reduce((map, cell) => {
      map[cell.rowStart] = cell;
      return map;
    }, {});
    return { dentist: d, cellMap, isNoAppointments: false };
  });

  if (isPastDate && !hasAnyAppointments) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No appointments found for this date.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-bold tracking-widest text-gray-400 sticky left-0 bg-gray-50 z-10 w-32 min-w-[120px]">
              TIME (EAT)
            </th>
            {dentists.map((d) => (
              <th key={d.id} className="px-3 py-3 text-center text-xs font-bold text-gray-600 min-w-[160px]">
                <div className="font-bold">{d.name}</div>
                <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                  {d.estimated_wait_minutes > 0 && !isPastDate
                    ? `~${d.estimated_wait_minutes} min wait`
                    : 'Available'}
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
                        {start} – {end} EAT
                      </span>
                    </div>
                    <div className="text-[10px] text-orange-400 mt-0.5">Lunch Break</div>
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
                  <div className="text-xs font-bold text-gray-700">{start}</div>
                  <div className="text-[10px] text-gray-400">→ {end}</div>
                </td>

                {columnData.map(({ dentist, cellMap, isNoAppointments }) => {
                  if (isNoAppointments) {
                    if (start === sharedRows[0]?.start) {
                      return (
                        <td
                          key={dentist.id}
                          rowSpan={sharedRows.length}
                          className="px-3 py-8 text-center bg-gray-50 align-middle"
                        >
                          <span className="text-xs text-gray-400">No appointments for this day</span>
                        </td>
                      );
                    }
                    return null;
                  }
                  
                  const cell = cellMap[start];
                  if (!cell || cell.type === 'skip') return null;

                  if (cell.type === 'outside') return (
                    <td key={dentist.id} className="px-3 py-2.5 bg-gray-50/20 border-b border-gray-100">
                      <span className="text-[10px] text-gray-200">—</span>
                    </td>
                  );

                  if (cell.type === 'booked') return (
                    <td
                      key={dentist.id}
                      rowSpan={cell.span}
                      className={`px-3 py-2.5 border border-blue-100 align-top ${
                        cell.status === 'in_progress' || cell.status === 'treatment_started' ? 'bg-yellow-50' :
                        cell.status === 'completed'   ? 'bg-green-50'  :
                        cell.status === 'checked_in'  ? 'bg-purple-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-gray-800 truncate max-w-[130px]">
                        {cell.patient_name}
                      </div>
                      <div className="flex items-center justify-between mt-0.5 flex-wrap gap-1">
                        <span className="text-[10px] text-gray-400">{cell.duration} min</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          statusColors[cell.status] ?? 'bg-gray-100 text-gray-500'
                        }`}>
                          {statusLabel[cell.status] ?? cell.status}
                        </span>
                      </div>
                    </td>
                  );

                  if (cell.type === 'free' && !isPastDate) return (
                    <td
                      key={dentist.id}
                      rowSpan={cell.span}
                      onClick={() => onSlotClick(dentist.id, cell.startTime, dentist.name)}
                      className="px-3 py-2.5 bg-green-50 border border-green-100 hover:bg-green-100 cursor-pointer transition-colors group align-top"
                    >
                      <div className="text-[11px] text-green-600 font-medium group-hover:text-green-700">Free</div>
                      <div className="text-[10px] text-green-400 mt-0.5">{cell.startTime} EAT</div>
                    </td>
                  );

                  if (cell.type === 'no_free') return (
                    <td key={dentist.id} className="px-3 py-2.5 bg-gray-50 text-center">
                      <span className="text-[10px] text-gray-300">—</span>
                    </td>
                  );

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

// ─────────────────────────────────────────────────────────────────────────────
// ManagerAppointments page
// ─────────────────────────────────────────────────────────────────────────────
export default function ManagerAppointments() {
  const [appointments,  setAppointments]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [dateFilter,    setDateFilter]    = useState(() => getEthiopianDate(0));
  const [selected,      setSelected]      = useState(null);
  const [activeTab,     setActiveTab]     = useState('list');
  const [availability,  setAvailability]  = useState(null);
  const [gridLoading,   setGridLoading]   = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [gridPrefill,   setGridPrefill]   = useState(null);
  const [dentistUnavailableModal, setDentistUnavailableModal] = useState(false);
  const [toast,         setToast]         = useState(null);
  const [isPastDate,    setIsPastDate]    = useState(false);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/manager/appointments');
      setAppointments(res.data.data ?? []);
    } catch { setError('Failed to load appointments.'); }
    finally  { setLoading(false); }
  }, []);

  const loadAvailability = useCallback(async () => {
    try {
      setGridLoading(true);
      const data = await getAvailability({ date: dateFilter });
      setAvailability(data);
      const today = getEthiopianDate(0);
      setIsPastDate(dateFilter < today);
    } catch (err) {
      console.error('Failed to load availability:', err);
    }
    finally  { setGridLoading(false); }
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'grid') loadAvailability(); }, [activeTab, dateFilter, loadAvailability]);

  const handleSaved = (data, warnings = []) => {
    load();
    if (activeTab === 'grid') loadAvailability();
    if (warnings.length > 0) showToast(warnings[0].message, 'warning');
    else showToast('Appointment booked.');
  };

  const handleStatusChange = async (id, status) => {
    try {
      await apiClient.put(`/manager/appointments/${id}`, { status });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      if (selected?.id === id) setSelected((s) => ({ ...s, status }));
      if (activeTab === 'grid') loadAvailability();
      showToast('Status updated.');
    } catch { showToast('Failed to update status.', 'error'); }
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await checkInAppointment(id);
      showToast(res.message || 'Patient checked in successfully.');
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'checked_in' } : a));
      if (selected?.id === id) setSelected((s) => ({ ...s, status: 'checked_in' }));
      if (activeTab === 'grid') loadAvailability();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'NO_ACTIVE_CARD') {
        showToast(data?.message || 'Patient does not have an active clinic card. Cannot check in.', 'error');
      } else {
        showToast(data?.message || 'Check-in failed. Please ensure patient has an active card.', 'error');
      }
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await apiClient.put(`/manager/appointments/${id}`, { status: 'cancelled' });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a));
      if (activeTab === 'grid') loadAvailability();
      showToast('Appointment cancelled.');
    } catch { showToast('Failed to cancel.', 'error'); }
  };

  const handleGridSlotClick = (dentistId, time, dentistName) => {
    setGridPrefill({
      dentist_id:       String(dentistId),
      appointment_date: dateFilter,
      appointment_time: time,
    });
    setModalOpen(true);
  };

  const filtered = appointments.filter((a) => {
    const matchSearch =
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.dentist_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchDate   = !dateFilter || a.date === dateFilter;
    return matchSearch && matchStatus && matchDate;
  });

  const counts = {
    total:     appointments.length,
    today:     appointments.filter((a) => {
      const today = getEthiopianDate(0);
      return a.date === today;
    }).length,
    pending:   appointments.filter((a) => ['pending', 'confirmed'].includes(a.status)).length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modalOpen && (
        <AppointmentRegistrationModal
          role="manager"
          prefill={gridPrefill}
          onClose={() => { setModalOpen(false); setGridPrefill(null); }}
          onSaved={handleSaved}
        />
      )}

      {dentistUnavailableModal && (
        <DentistUnavailableModal
          onClose={() => setDentistUnavailableModal(false)}
          onSuccess={() => { load(); if (activeTab === 'grid') loadAvailability(); }}
        />
      )}

      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Branch Manager</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500 mt-1">Schedule, manage, and track all branch appointments.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDentistUnavailableModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              <UserX className="w-4 h-4" /> Dentist Unavailable
            </button>
            <button
              onClick={() => { setGridPrefill(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Appointment
            </button>
          </div>
        </div>
      </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none" />
        {activeTab === 'list' && (
          <>
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search patient, dentist, type..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm text-gray-700 outline-none bg-transparent" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none">
              <option value="All">All statuses</option>
              {Object.entries(statusLabel).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>
      )}

      {activeTab === 'list' && (
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">All Appointments</h2>
                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['PATIENT', 'DENTIST', 'DATE', 'TIME (EAT)', 'TYPE', 'STATUS', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">No appointments found.</td>
                    </tr>
                  ) : filtered.map((a) => (
                    <tr key={a.id}
                      onClick={() => setSelected(selected?.id === a.id ? null : a)}
                      className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selected?.id === a.id ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{a.patient_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.dentist_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.date}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.time} EAT</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.type}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[a.status]}`}>
                          {statusLabel[a.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(a.id); }}
                          disabled={['cancelled', 'completed', 'no_show'].includes(a.status)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-30"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Appointment Detail</p>
                <h3 className="text-sm font-bold text-gray-900">{selected.patient_name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selected.type}</p>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Dentist',  value: selected.dentist_name },
                  { label: 'Date',     value: selected.date },
                  { label: 'Time',     value: `${selected.time} EAT` },
                  { label: 'Duration', value: `${selected.duration_minutes} min` },
                  { label: 'Status',   value: statusLabel[selected.status] },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Last Medical Case</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{selected.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['confirmed', 'checked_in', 'in_progress', 'treatment_started', 'completed', 'no_show', 'cancelled'].map((s) => (
                    <button key={s}
                      onClick={() => {
                        if (s === 'checked_in' && selected.status === 'confirmed') handleCheckIn(selected.id);
                        else handleStatusChange(selected.id, s);
                      }}
                      disabled={selected.status === s}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40 ${
                        selected.status === s
                          ? 'bg-gray-100 text-gray-400'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {statusLabel[s]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleCancel(selected.id)}
                disabled={['cancelled', 'completed', 'no_show'].includes(selected.status)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                Cancel Appointment
              </button>
            </div>
          ) : (
            <div className="w-72 shrink-0 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center">
              <CalendarDays className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400">Select an appointment</p>
              <p className="text-xs text-gray-300 mt-1">Click any row to view details.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'grid' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {gridLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
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