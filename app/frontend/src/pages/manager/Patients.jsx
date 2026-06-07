import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, UserRound } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';
import PatientModal from '../../components/patients/PatientModal';

const genderColors = {
  male:   'bg-blue-50 text-blue-700 border border-blue-200',
  female: 'bg-pink-50 text-pink-700 border border-pink-200',
  other:  'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function ManagerPatients() {
  const { user } = useAuthStore();

  const fixedBranch = user?.branch
    ? { id: user.branch.id, name: user.branch.name }
    : null;

  const [patients,     setPatients]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [selected,     setSelected]     = useState(null);
  const [modal,        setModal]        = useState(null); // null | 'add' | patient object
  const [toast,        setToast]        = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/manager/patients');
      setPatients(res.data.data ?? []);
    } catch {
      setError('Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (modal === 'add') {
      await apiClient.post('/manager/patients', form);
      showToast('Patient registered successfully.');
    } else {
      await apiClient.put(`/manager/patients/${modal.id}`, form);
      showToast('Patient updated.');
    }
    load();
  };

  const filtered = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchSearch =
      name.includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchGender = genderFilter === 'All' || p.gender === genderFilter;
    return matchSearch && matchGender;
  });

  const counts = {
    total:  patients.length,
    male:   patients.filter(p => p.gender === 'male').length,
    female: patients.filter(p => p.gender === 'female').length,
    new:    patients.filter(p => {
      const d = new Date(p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Shared modal */}
      {modal !== null && (
        <PatientModal
          patient={modal === 'add' ? null : modal}
          fixedBranch={fixedBranch}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Branch Manager</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage patient records for{' '}
              <span className="font-semibold">{fixedBranch?.name ?? 'your branch'}</span>.
            </p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Register Patient
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: counts.total,  bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'Male',           value: counts.male,   bg: 'bg-indigo-50', color: 'text-indigo-600' },
          { label: 'Female',         value: counts.female, bg: 'bg-pink-50',   color: 'text-pink-600' },
          { label: 'New This Month', value: counts.new,    bg: 'bg-green-50',  color: 'text-green-600' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search patients by name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
        >
          <option value="All">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Table + Detail panel */}
      <div className="flex gap-4">

        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Patient Registry</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Patient', 'Phone', 'Gender', 'DOB', 'Registered', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No patients found.
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selected?.id === p.id ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {p.first_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-gray-400">{p.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${genderColors[p.gender] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.gender || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.date_of_birth ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.registered ?? p.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setModal(p); }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 text-xl font-bold flex items-center justify-center mb-3">
                {selected.first_name?.charAt(0)}
              </div>
              <p className="text-sm font-bold text-gray-900">{selected.first_name} {selected.last_name}</p>
              {selected.gender && (
                <span className={`mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${genderColors[selected.gender]}`}>
                  {selected.gender}
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              {[
                { label: 'Phone',      value: selected.phone },
                { label: 'Email',      value: selected.email || '—' },
                { label: 'DOB',        value: selected.date_of_birth || '—' },
                { label: 'City',       value: selected.city || '—' },
                { label: 'Insurance',  value: selected.insurance_provider || '—' },
                { label: 'Ins. No.',   value: selected.insurance_number || '—' },
                { label: 'Branch',     value: fixedBranch?.name || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 shrink-0">{label}</span>
                  <span className="font-semibold text-gray-800 text-right ml-2 truncate max-w-[150px]">{value}</span>
                </div>
              ))}
            </div>

            {selected.current_case && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Current Case</p>
                <p className="text-xs text-gray-700 leading-relaxed">{selected.current_case}</p>
              </div>
            )}

            {selected.medical_history && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Medical History</p>
                <p className="text-xs text-gray-600 leading-relaxed">{selected.medical_history}</p>
              </div>
            )}

            {selected.other_conditions && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Other Conditions</p>
                <p className="text-xs text-gray-700 leading-relaxed">{selected.other_conditions}</p>
              </div>
            )}

            <button
              onClick={() => setModal(selected)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              Edit Patient
            </button>
          </div>
        ) : (
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center">
            <UserRound className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">Select a patient</p>
            <p className="text-xs text-gray-300 mt-1">Click any row to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}