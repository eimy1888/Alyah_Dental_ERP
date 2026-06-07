import { useState } from 'react';
import { Search, Download, Plus, X, ChevronDown } from 'lucide-react';

const DENTISTS = [
  {
    id: 1,
    name: 'Dr. Michael Chen',
    specialty: 'Orthodontics',
    branches: 'Bole, Kazanchis',
    utilization: 82,
    nextBlock: 'Today 14:00',
  },
  {
    id: 2,
    name: 'Dr. Hana Bekele',
    specialty: 'Endodontics',
    branches: 'Bole',
    utilization: 74,
    nextBlock: 'Tomorrow 09:00',
  },
  {
    id: 3,
    name: 'Dr. Sarah Johnson',
    specialty: 'General',
    branches: 'CMC, Bole',
    utilization: 68,
    nextBlock: 'Today 16:30',
  },
];

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

function CreateScheduleModal({ onClose }) {
  const [form, setForm] = useState({
    dentist: '',
    branch: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  const handleSubmit = () => {
    alert(`Schedule created for ${form.dentist} at ${form.branch}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Create Schedule</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dentist</label>
            <select
              value={form.dentist}
              onChange={(e) => setForm({ ...form, dentist: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select dentist</option>
              {DENTISTS.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Create Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dentists() {
  const [dentists, setDentists] = useState(DENTISTS);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = dentists.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">

      {showModal && (
        <CreateScheduleModal onClose={() => setShowModal(false)} />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
            Workspace Module
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Dentist Allocation Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            Coordinate branch rotations, schedules, chair allocation, and specialty capacity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create schedule
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dentist allocation board..."
            className="text-sm text-gray-700 placeholder-gray-400 outline-none w-full bg-transparent"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50">
          All segments <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Dentist Allocation Board</h2>
              <p className="text-xs text-gray-400">{filtered.length} records</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
            >
              Create schedule <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Dentist', 'Specialty', 'Branches', 'Utilization', 'Next Block'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold tracking-widest text-gray-400 uppercase pb-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d.id === selected ? null : d.id)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-4 pr-4 font-semibold text-gray-900">{d.name}</td>
                  <td className="py-4 pr-4 text-gray-600">{d.specialty}</td>
                  <td className="py-4 pr-4 text-gray-600 text-xs">{d.branches}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                        <div
                          className={`h-full rounded-full ${utilizationColor(d.utilization)}`}
                          style={{ width: `${d.utilization}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${utilizationBadge(d.utilization)}`}>
                        {d.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-600 text-xs">{d.nextBlock}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expanded detail */}
          {selected && (() => {
            const d = dentists.find((x) => x.id === selected);
            return (
              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-blue-900">{d.name} — Quick View</p>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-blue-800">
                  <div><p className="text-blue-400 mb-0.5">Specialty</p><p className="font-semibold">{d.specialty}</p></div>
                  <div><p className="text-blue-400 mb-0.5">Branches</p><p className="font-semibold">{d.branches}</p></div>
                  <div><p className="text-blue-400 mb-0.5">Next Block</p><p className="font-semibold">{d.nextBlock}</p></div>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Create schedule →
                </button>
              </div>
            );
          })()}
        </div>

        {/* Module summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Module Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total records</p>
                <p className="text-2xl font-bold text-gray-900">{dentists.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Filtered</p>
                <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Action needed</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Last updated</p>
                <p className="text-2xl font-bold text-gray-900">Today</p>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                  Active / Healthy
                </span>
                <span className="text-sm font-bold text-gray-900">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  Needs attention
                </span>
                <span className="text-sm font-bold text-gray-900">1</span>
              </div>
            </div>
          </div>

          {/* Utilization overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Utilization Overview</h3>
            <div className="space-y-3">
              {dentists.map((d) => (
                <div key={d.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 truncate">{d.name.split(' ').slice(-1)[0]}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${utilizationBadge(d.utilization)}`}>
                      {d.utilization}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${utilizationColor(d.utilization)}`}
                      style={{ width: `${d.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}