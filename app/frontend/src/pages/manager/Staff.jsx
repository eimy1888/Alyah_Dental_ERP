import { useState, useEffect, queryClient} from 'react';
import { Search, Plus, Loader2, Users, Phone, Mail } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';
import StaffModal from '../../components/staff/StaffModal';

const roleColors = {
  branch_manager: 'bg-blue-50 text-blue-700 border border-blue-200',
  dentist:        'bg-purple-50 text-purple-700 border border-purple-200',
  receptionist:   'bg-green-50 text-green-700 border border-green-200',
  accountant:     'bg-amber-50 text-amber-700 border border-amber-200',
};

const roleLabels = {
  branch_manager: 'Branch Manager',
  dentist:        'Dentist',
  receptionist:   'Receptionist',
  accountant:     'Accountant',
};

const ROLES = ['dentist', 'receptionist', 'accountant'];

export default function ManagerStaff() {
  const { user } = useAuthStore();

  // Fixed branch from session — branch manager always belongs to one branch
  const fixedBranch = user?.branch
    ? { id: user.branch.id, name: user.branch.name }
    : null;

  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [modal,      setModal]      = useState(null); // null | 'add' | staff object
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState('');
  const [tempCreds,  setTempCreds]  = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/manager/staff');
      setStaff(res.data.data ?? []);
    } catch {
      setError('Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);


    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

const handleSave = async (formData, id) => {
    if (id) {
      const res = await apiClient.post(`/manager/staff/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      invalidate();
      showToast(`${res.data?.data?.name} updated.`);
      return res.data;  // ← ADD THIS
    } else {
      const res = await apiClient.post('/manager/staff', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      invalidate();
      if (res.data.temp_password) {
        setTempCreds({
          name:     res.data.data?.name     ?? '',
          email:    res.data.data?.email    ?? '',
          password: res.data.temp_password,
        });
      } else {
        showToast(`${res.data?.data?.name} added successfully.`);
      }
      return res.data;  // ← ADD THIS
    }
  };

  const handleToggleActive = async (member) => {
    try {
      const fd = new FormData();
      fd.append('_method', 'PUT');
      fd.append('is_active', member.is_active ? '0' : '1');
      await apiClient.post(`/manager/staff/${member.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStaff(prev => prev.map(s =>
        s.id === member.id ? { ...s, is_active: !s.is_active } : s
      ));
      showToast(`${member.name} ${member.is_active ? 'deactivated' : 'activated'}.`);
    } catch {
      showToast('Failed to update status.');
    }
  };

  const filtered = staff.filter(s => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total:         staff.length,
    dentists:      staff.filter(s => s.role === 'dentist').length,
    receptionists: staff.filter(s => s.role === 'receptionist').length,
    accountants:   staff.filter(s => s.role === 'accountant').length,
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

      {/* Shared modal — branch is fixed to manager's branch */}
      {modal !== null && (
        <StaffModal
          member={modal === 'add' ? null : modal}
          branches={[]}
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
            <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage staff in <span className="font-semibold">{fixedBranch?.name ?? 'your branch'}</span>.
            </p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff',    value: counts.total,         bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'Dentists',       value: counts.dentists,      bg: 'bg-purple-50', color: 'text-purple-600' },
          { label: 'Receptionists',  value: counts.receptionists, bg: 'bg-green-50',  color: 'text-green-600' },
          { label: 'Accountants',    value: counts.accountants,   bg: 'bg-amber-50',  color: 'text-amber-600' },
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
            placeholder="Search staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
        >
          <option value="All">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Staff grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No staff members found.</p>
          <button
            onClick={() => setModal('add')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Add first staff member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => (
            <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {member.name?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColors[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {roleLabels[member.role] ?? member.role}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  member.is_active
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{member.email || '—'}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.specialization && (
                  <p className="text-xs text-gray-500">🏥 {member.specialization}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <button
                  onClick={() => setModal(member)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(member)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                    member.is_active
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}