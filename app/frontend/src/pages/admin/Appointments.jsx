import { useState } from 'react';
import { Search, Plus, ChevronDown, X, Clock, CheckCircle2, Users, AlarmCheck } from 'lucide-react';

const APPOINTMENTS = [
  {
    id: 'APT-2026-0001',
    patient: 'Mikiyas Haile',
    dentist: 'Dr. Michael Chen',
    type: 'Consultation',
    branch: 'Bole Flagship',
    time: '09:30',
    queue: '#1 · ~10 min wait',
    status: 'confirmed',
  },
  {
    id: 'APT-2026-0002',
    patient: 'Rahel Abebe',
    dentist: 'Dr. Hana Bekele',
    type: 'Whitening',
    branch: 'Bole Flagship',
    time: '10:15',
    queue: '#2 · ~20 min wait',
    status: 'checked in',
  },
  {
    id: 'APT-2026-0003',
    patient: 'Daniel Bekele',
    dentist: 'Dr. Michael Chen',
    type: 'Root Canal',
    branch: 'Kazanchis Branch',
    time: '11:00',
    queue: '#1 · ~0 min wait',
    status: 'in progress',
  },
  {
    id: 'APT-2026-0004',
    patient: 'Elsa Kebede',
    dentist: 'Dr. Sarah Johnson',
    type: 'Follow Up',
    branch: 'CMC Satellite',
    time: '14:30',
    queue: 'Not queued',
    status: 'pending',
  },
  {
    id: 'APT-2026-0005',
    patient: 'Yonatan Gemechu',
    dentist: 'Dr. Michael Chen',
    type: 'Orthodontics',
    branch: 'Bole Flagship',
    time: '15:00',
    queue: 'Not queued',
    status: 'completed',
  },
];

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Checked In', 'In Progress', 'Completed'];

const statusBadge = {
  confirmed: 'bg-blue-100 text-blue-700',
  'checked in': 'bg-teal-100 text-teal-700',
  'in progress': 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

const metrics = [
  { label: 'Pending', value: '1', sub: 'Needs confirmation', icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  { label: 'Checked in', value: '1', sub: 'Live queue', icon: Users, iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
  { label: 'In progress', value: '1', sub: 'Active chairs', icon: AlarmCheck, iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
  { label: 'Completed', value: '1', sub: 'Today', icon: CheckCircle2, iconBg: 'bg-green-50', iconColor: 'text-green-500' },
];

const VIEWS = ['Cards', 'Queue', 'Table', 'Calendar'];

function NewAppointmentModal({ onClose }) {
  const [form, setForm] = useState({
    patient: '', dentist: '', type: '', branch: '', date: '', time: '',
  });

  const handleSubmit = () => {
    alert(`Appointment booked for ${form.patient}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">New Appointment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient name</label>
            <input
              value={form.patient}
              onChange={(e) => setForm({ ...form, patient: e.target.value })}
              placeholder="e.g. Mikiyas Haile"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dentist</label>
            <select
              value={form.dentist}
              onChange={(e) => setForm({ ...form, dentist: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select dentist</option>
              <option>Dr. Michael Chen</option>
              <option>Dr. Hana Bekele</option>
              <option>Dr. Sarah Johnson</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Treatment type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select type</option>
              <option>Consultation</option>
              <option>Whitening</option>
              <option>Root Canal</option>
              <option>Orthodontics</option>
              <option>Follow Up</option>
              <option>Extraction</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
            <select
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select branch</option>
              <option>Bole Flagship</option>
              <option>Kazanchis Branch</option>
              <option>CMC Satellite</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors">
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ appt, onClose }) {
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {toast && (
          <div className="absolute top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg z-10">
            {toast}
          </div>
        )}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-mono">{appt.id}</p>
            <h3 className="text-base font-bold text-gray-900">{appt.patient}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { label: 'Dentist', value: appt.dentist },
            { label: 'Type', value: appt.type },
            { label: 'Branch', value: appt.branch },
            { label: 'Time', value: appt.time },
            { label: 'Queue', value: appt.queue },
            { label: 'Status', value: appt.status },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">{label}</span>
              {label === 'Status' ? (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[value]}`}>
                  {value}
                </span>
              ) : (
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={() => showToast('Reschedule approved')}
            className="flex-1 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Approve Reschedule
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Appointments() {
  const [appointments, setAppointments] = useState(APPOINTMENTS);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeView, setActiveView] = useState('Cards');
  const [showNewModal, setShowNewModal] = useState(false);
  const [detailAppt, setDetailAppt] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const filtered = appointments.filter((a) => {
    const matchSearch =
      a.patient.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.dentist.toLowerCase().includes(search.toLowerCase()) ||
      a.branch.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'All' ||
      a.status === activeFilter.toLowerCase().replace(' ', ' ');
    return matchSearch && matchFilter;
  });

  const handleAction = (apptId, action) => {
    const actionMap = {
      'Check In': 'checked in',
      'Start': 'in progress',
      'Complete': 'completed',
      'Confirm': 'confirmed',
      'Cancel': 'cancelled',
      'No Show': 'cancelled',
    };
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === apptId ? { ...a, status: actionMap[action] ?? a.status } : a
      )
    );
    showToast(`${action} — ${apptId}`);
  };

  const actionButtons = (appt) => {
    switch (appt.status) {
      case 'pending':
        return [
          { label: 'Confirm', style: 'bg-[#1F4E79] text-white hover:bg-blue-900' },
          { label: 'Cancel', style: 'border border-red-300 text-red-500 hover:bg-red-50' },
        ];
      case 'confirmed':
        return [
          { label: 'Check In', style: 'bg-[#1F4E79] text-white hover:bg-blue-900' },
          { label: 'Reschedule', style: 'bg-[#1F4E79] text-white hover:bg-blue-900' },
        ];
      case 'checked in':
        return [
          { label: 'Start', style: 'bg-[#1F4E79] text-white hover:bg-blue-900' },
          { label: 'No Show', style: 'border border-red-300 text-red-500 hover:bg-red-50' },
        ];
      case 'in progress':
        return [
          { label: 'Complete', style: 'bg-[#1F4E79] text-white hover:bg-blue-900' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {showNewModal && <NewAppointmentModal onClose={() => setShowNewModal(false)} />}
      {detailAppt && <DetailModal appt={detailAppt} onClose={() => setDetailAppt(null)} />}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
            Appointment Module
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Calendar, daily queue, weekly schedule, and appointment workflow
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Queue position, dentist capacity, branch context, and treatment-ready actions in one scheduling surface.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> New Appointment
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{m.label}</p>
                <p className="text-3xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${m.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient, appointment number, dentist, or branch..."
            className="text-sm text-gray-700 placeholder-gray-400 outline-none w-full bg-transparent"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeFilter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduling views */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Scheduling Views</h2>
            <p className="text-xs text-gray-400">
              {filtered.length} appointments · Switch between cards, queue, table, and calendar.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeView === v
                    ? 'bg-[#1F4E79] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Cards view */}
        {activeView === 'Cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filtered.map((appt) => (
              <div
                key={appt.id}
                className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">{appt.id}</p>
                    <p className="text-base font-bold text-gray-900">{appt.patient}</p>
                    <p className="text-xs text-gray-500">{appt.dentist} · {appt.type}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusBadge[appt.status]}`}>
                    {appt.status}
                  </span>
                </div>
                <div className="space-y-1.5 mb-4">
                  {[
                    { label: 'Branch', value: appt.branch },
                    { label: 'Time', value: appt.time },
                    { label: 'Queue', value: appt.queue },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-medium text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {actionButtons(appt).map(({ label, style }) => (
                    <button
                      key={label}
                      onClick={() => handleAction(appt.id, label)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${style}`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setDetailAppt(appt)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Queue view */}
        {activeView === 'Queue' && (
          <div className="mt-4 space-y-3">
            {filtered
              .filter((a) => ['confirmed', 'checked in', 'in progress'].includes(a.status))
              .map((appt, i) => (
                <div key={appt.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-[#1F4E79] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">#{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{appt.patient}</p>
                    <p className="text-xs text-gray-500">{appt.dentist} · {appt.type} · {appt.branch}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{appt.time}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[appt.status]}`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            {filtered.filter((a) => ['confirmed', 'checked in', 'in progress'].includes(a.status)).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No active queue items.</p>
            )}
          </div>
        )}

        {/* Table view */}
        {activeView === 'Table' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID', 'Patient', 'Dentist', 'Type', 'Branch', 'Time', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-bold tracking-widest text-gray-400 uppercase pb-3 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 text-xs font-mono text-gray-500">{a.id}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-900">{a.patient}</td>
                    <td className="py-3 pr-4 text-gray-600 text-xs">{a.dentist}</td>
                    <td className="py-3 pr-4 text-gray-600">{a.type}</td>
                    <td className="py-3 pr-4 text-gray-600 text-xs">{a.branch}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{a.time}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setDetailAppt(a)}
                        className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Calendar view */}
        {activeView === 'Calendar' && (
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 3;
                const isToday = day === 16;
                const hasAppt = [16].includes(day);
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-colors ${
                      day < 1 || day > 31
                        ? 'text-gray-200'
                        : isToday
                        ? 'bg-[#1F4E79] text-white'
                        : hasAppt
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day > 0 && day <= 31 ? day : ''}
                    {hasAppt && !isToday && (
                      <div className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 space-y-2">
              {filtered.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-1 h-8 rounded-full bg-[#1F4E79] shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{a.patient}</p>
                    <p className="text-xs text-gray-500">{a.time} · {a.dentist} · {a.branch}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[a.status]}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}