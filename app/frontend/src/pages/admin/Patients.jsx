import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, FileText, Plus, X, Loader2 } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── API ───────────────────────────────────────────────────────────────────────
const fetchPatients = (params) =>
  apiClient.get('/admin/patients', { params }).then(r => r.data);

const fetchPatient = (id) =>
  apiClient.get(`/admin/patients/${id}`).then(r => r.data);

const createPatient = (data) =>
  apiClient.post('/admin/patients', data).then(r => r.data);

const updatePatient = ({ id, ...data }) =>
  apiClient.put(`/admin/patients/${id}`, data).then(r => r.data);

const deletePatient = (id) =>
  apiClient.delete(`/admin/patients/${id}`).then(r => r.data);

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLORS = [
  'bg-blue-600', 'bg-green-600', 'bg-purple-600',
  'bg-amber-600', 'bg-teal-600', 'bg-rose-600',
];

const getColor = (name) => COLORS[name.charCodeAt(0) % COLORS.length];

const initials = (name) =>
  name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';

const statusBadge = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const invStatusBadge = {
  paid:     'bg-green-100 text-green-700',
  partial:  'bg-amber-100 text-amber-700',
  overdue:  'bg-red-100 text-red-700',
  sent:     'bg-blue-100 text-blue-700',
  draft:    'bg-gray-100 text-gray-600',
};

const PROFILE_TABS = ['Overview', 'Medical History', 'Billing History'];

// ── Add Patient Modal ─────────────────────────────────────────────────────────
function PatientModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    city: '', address: '', insurance_provider: '',
    insurance_number: '', medical_notes: '', status: 'active',
  });
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name required';
    if (!form.last_name.trim())  e.last_name  = 'Last name required';
    if (!form.phone.trim())      e.phone      = 'Phone required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setApiError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between sticky top-0">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">Patient Registry</p>
            <h2 className="text-white text-xl font-bold mt-0.5">Register New Patient</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{apiError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                placeholder="Mikiyas"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.first_name ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                placeholder="Haile"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.last_name ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+251 911..."
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="patient@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)}
                placeholder="Addis Ababa"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Insurance</label>
              <input value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)}
                placeholder="Nib Insurance / Private Pay"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Medical Notes</label>
            <textarea value={form.medical_notes} onChange={e => set('medical_notes', e.target.value)}
              rows={3} placeholder="Allergies, conditions, notes..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Register Patient'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Patients() {
  const queryClient = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAdd,   setShowAdd]   = useState(false);
  const [toast,     setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn:  () => fetchPatients({ search }),
    staleTime: 30000,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['patient', selected?.id],
    queryFn:  () => fetchPatient(selected.id),
    enabled:  !!selected?.id,
    staleTime: 30000,
  });

  const patients = data?.data || [];
  const profile  = profileData?.data || selected;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      showToast(`${res.data.first_name} ${res.data.last_name} registered.`);
    },
  });

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span>✅</span><span className="text-sm">{toast}</span>
          <button onClick={() => setToast('')} className="ml-2 text-gray-400 hover:text-white">×</button>
        </div>
      )}

      {showAdd && (
        <PatientModal
          onClose={() => setShowAdd(false)}
          onSave={(data) => createMutation.mutateAsync(data)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Clinic Module</p>
          <h1 className="text-3xl font-bold text-gray-900">Patient Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demographics, insurance, medical history, and billing.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors">
          <Plus className="w-4 h-4" /> New Patient
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, or phone..."
          className="text-sm text-gray-700 placeholder-gray-400 outline-none w-full bg-transparent" />
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Patient list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Patients</h2>
            <p className="text-xs text-gray-400">{isLoading ? '...' : `${patients.length} records`}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {patients.map(p => (
                <div key={p.id}
                  onClick={() => { setSelected(p); setActiveTab('Overview'); }}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                    selected?.id === p.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full ${getColor(p.first_name)} flex items-center justify-center shrink-0`}>
                    <span className="text-xs font-bold text-white">{initials(p.full_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.full_name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${statusBadge[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{p.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-700">
                      {p.outstanding > 0 ? `ETB ${Number(p.outstanding).toLocaleString()}` : 'Settled'}
                    </p>
                    <p className="text-[10px] text-gray-400">{p.insurance_provider || 'No insurance'}</p>
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">No patients found.</div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        {selected && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {profile?.full_name || selected.full_name} — Profile
              </h2>

              {profile?.medical_notes && (
                <div className="mt-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                  ⚠ {profile.medical_notes}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {PROFILE_TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeTab === tab ? 'bg-[#1F4E79] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {profileLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : (
                <>
                  {/* Overview */}
                  {activeTab === 'Overview' && (
                    <div className="space-y-3">
                      {[
                        { label: 'Email',     value: profile?.email || '—' },
                        { label: 'Phone',     value: profile?.phone },
                        { label: 'City',      value: profile?.city || '—' },
                        { label: 'Insurance', value: profile?.insurance_provider || 'Private Pay' },
                        { label: 'Outstanding', value: profile?.outstanding > 0
                          ? `ETB ${Number(profile.outstanding).toLocaleString()}`
                          : 'Settled' },
                        { label: 'Branch',    value: profile?.branch?.name || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50">
                          <span className="text-sm text-gray-500">{label}</span>
                          <span className="text-sm font-semibold text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Billing History */}
                  {activeTab === 'Billing History' && (
                    <div className="space-y-3">
                      {(profile?.invoices || []).length === 0 ? (
                        <p className="text-xs text-gray-400">No billing history.</p>
                      ) : (
                        (profile?.invoices || []).map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                              <p className="text-xs text-gray-500">{inv.issued_at}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">ETB {Number(inv.total).toLocaleString()}</p>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${invStatusBadge[inv.status]}`}>
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Medical History */}
                  {activeTab === 'Medical History' && (
                    <div>
                      {profile?.medical_notes ? (
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="text-sm text-gray-800">{profile.medical_notes}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No medical notes recorded.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}