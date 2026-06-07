import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Loader2, UserRound, FileText, CreditCard } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';
import PatientModal from '../../components/patients/PatientModal';

const fetchPatients = (params) =>
  apiClient.get('/receptionist/patients', { params }).then(r => r.data);

const createPatient = (data) =>
  apiClient.post('/receptionist/patients', data).then(r => r.data);

const updatePatient = ({ id, ...data }) =>
  apiClient.put(`/receptionist/patients/${id}`, data).then(r => r.data);

const genderColors = {
  male:   'bg-blue-50 text-blue-700 border border-blue-200',
  female: 'bg-pink-50 text-pink-700 border border-pink-200',
  other:  'bg-gray-100 text-gray-600 border border-gray-200',
};

const statusBadge = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  archived: 'bg-red-100 text-red-600',
};

const PROFILE_TABS = ['Overview', 'Medical Records', 'Insurance'];

export default function ReceptionistPatients() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const fixedBranch = user?.branch
    ? { id: user.branch.id, name: user.branch.name }
    : null;

  const [search,       setSearch]       = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [selected,     setSelected]     = useState(null);
  const [activeTab,    setActiveTab]    = useState('Overview');
  const [modal,        setModal]        = useState(null); // null | 'add' | patient object
  const [toast,        setToast]        = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['receptionist-patients', search, genderFilter],
    queryFn:  () => fetchPatients({
      search,
      gender: genderFilter !== 'All' ? genderFilter : undefined,
    }),
    staleTime: 30000,
  });

  const patients = data?.data || [];

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist-patients'] });
      showToast(`${res.data?.first_name} ${res.data?.last_name} registered.`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updatePatient,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist-patients'] });
      showToast(`${res.data?.first_name} ${res.data?.last_name} updated.`);
    },
  });

  const handleSave = async (form) => {
    if (modal === 'add') {
      await createMutation.mutateAsync(form);
    } else {
      await updateMutation.mutateAsync({ id: modal.id, ...form });
    }
  };

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

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span>✅</span>
          <span className="text-sm">{toast}</span>
          <button onClick={() => setToast('')} className="ml-2 text-gray-400 hover:text-white">×</button>
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
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Front Desk</p>
          <h1 className="text-2xl font-bold text-gray-900">Patient Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Register and manage patients for{' '}
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
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none"
        >
          <option value="All">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {isError && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
          Failed to load patients.
        </div>
      )}

      {/* Split layout */}
      <div className="flex gap-4">

        {/* Patient list */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Patients</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isLoading ? '...' : `${patients.length} records`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Patient', 'Phone', 'Gender', 'DOB', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                      No patients found.
                    </td>
                  </tr>
                ) : patients.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => { setSelected(p); setActiveTab('Overview'); }}
                    className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selected?.id === p.id ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {p.first_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-xs text-gray-400">{p.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${genderColors[p.gender] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.gender || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.date_of_birth || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
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
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Profile header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center shrink-0">
                  {selected.first_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {selected.first_name} {selected.last_name}
                  </p>
                  {selected.gender && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${genderColors[selected.gender]}`}>
                      {selected.gender}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1">
                {PROFILE_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">

              {/* Overview tab */}
              {activeTab === 'Overview' && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Phone</span>
                    <span className="font-semibold text-gray-800 text-right ml-2 max-w-[160px] truncate">{selected.phone}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Email</span>
                    <span className="font-semibold text-gray-800 text-right ml-2 max-w-[160px] truncate">{selected.email || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">DOB</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{selected.date_of_birth || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">City</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{selected.city || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Address</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{selected.address || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Branch</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{fixedBranch?.name || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Status</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{selected.status}</span>
                  </div>
                  {/* Clinic Card Status - NEW */}
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Clinic Card</span>
                    <div className="text-right">
                      {selected.has_active_card ? (
                        <span className="text-xs font-semibold text-green-600">Active</span>
                      ) : (
                        <span className="text-xs font-semibold text-red-500">Not Active</span>
                      )}
                      {selected.card_number && (
                        <p className="text-xs text-gray-400 mt-0.5">Card: {selected.card_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Records tab */}
              {activeTab === 'Medical Records' && (
                <div className="space-y-3">
                  {selected.current_case && (
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                      <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Current Case</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{selected.current_case}</p>
                    </div>
                  )}
                  {selected.medical_history && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Previous Medical History</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{selected.medical_history}</p>
                    </div>
                  )}
                  {selected.other_conditions && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                      <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Other Conditions</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{selected.other_conditions}</p>
                    </div>
                  )}
                  {!selected.current_case && !selected.medical_history && !selected.other_conditions && (
                    <div className="text-center py-6">
                      <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No medical records.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Insurance tab */}
              {activeTab === 'Insurance' && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Provider</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{selected.insurance_provider || 'Not provided'}</span>
                  </div>
                  <div className="flex items-start justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 shrink-0">Number</span>
                    <span className="font-semibold text-gray-800 text-right ml-2">{selected.insurance_number || '—'}</span>
                  </div>
                </div>
              )}

            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setModal(selected)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Edit Patient
              </button>
            </div>
          </div>
        ) : (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center">
            <UserRound className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">Select a patient</p>
            <p className="text-xs text-gray-300 mt-1">Click any row to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}