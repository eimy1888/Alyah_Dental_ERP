import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import StaffModal from '../../components/staff/StaffModal';

// ── API helpers ───────────────────────────────────────────────────────────────
const fetchStaff = (params) =>
  apiClient.get('/admin/staff', { params }).then(r => r.data);

const fetchBranches = () =>
  apiClient.get('/admin/branches').then(r => r.data);

const deleteStaff = (id) =>
  apiClient.delete(`/admin/staff/${id}`).then(r => r.data);

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = [
  { label: 'Dentist',        value: 'dentist' },
  { label: 'Receptionist',   value: 'receptionist' },
  { label: 'Accountant',     value: 'accountant' },
  { label: 'Branch Manager', value: 'branch_manager' },
  { label: 'Clinic Admin',   value: 'clinic_admin' },
];

const roleBadge = {
  dentist:         'bg-blue-100 text-blue-700',
  receptionist:    'bg-green-100 text-green-700',
  accountant:      'bg-amber-100 text-amber-700',
  clinic_admin:    'bg-purple-100 text-purple-700',
  branch_manager:  'bg-teal-100 text-teal-700',
};

const roleLabel = {
  dentist:        'Dentist',
  receptionist:   'Receptionist',
  accountant:     'Accountant',
  clinic_admin:   'Clinic Admin',
  branch_manager: 'Branch Manager',
};

const initials = (name) =>
  (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

function Toast({ msg, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
      <span>✅</span>
      <span className="text-sm">{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}

function TempPasswordModal({ name, email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5">
          <p className="text-green-100 text-xs font-semibold tracking-widest uppercase">Staff Added</p>
          <h2 className="text-white text-xl font-bold mt-0.5">Login Credentials Ready</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            A login account has been created for <span className="font-semibold text-gray-900">{name}</span>.
            Share these credentials — the password cannot be retrieved later.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            {email && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Email / Login</p>
                <p className="text-sm font-mono font-semibold text-gray-800">{email}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Temporary Password</p>
              <div className="flex items-center gap-3">
                <p className="text-sm font-mono font-bold text-gray-900 tracking-widest">{password}</p>
                <button onClick={copy} className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-amber-500 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-700">Ask the staff member to change their password after first login.</p>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800">
            Done — I've noted the credentials
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ name, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">Remove Staff Member</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to remove <span className="font-semibold text-gray-900">{name}</span>?
          This will also delete their login account.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Staff() {
  const queryClient = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState(null);
  const [tempCreds,    setTempCreds]    = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff', search, roleFilter],
    queryFn:  () => fetchStaff({ search, role: roleFilter }),
    staleTime: 30000,
  });

  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn:  fetchBranches,
    staleTime: 60000,
  });

  const staff    = data?.data    || [];
  const meta     = data?.meta    || { total: 0, active: 0, by_role: {} };
  const branches = branchData?.data || [];
  const byRole   = meta.by_role  || {};

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

 const handleSave = async (formData, id) => {
    if (id) {
      const res = await apiClient.put(`/admin/staff/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      invalidate();
      showToast(`${res.data?.data?.name} updated.`);
      return res.data;
    } else {
      const res = await apiClient.post('/admin/staff', formData, {
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

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => { invalidate(); showToast('Staff member removed.'); setDeleteTarget(null); },
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {toast        && <Toast msg={toast} onClose={() => setToast(null)} />}
      {tempCreds    && <TempPasswordModal {...tempCreds} onClose={() => setTempCreds(null)} />}
      {deleteTarget && (
        <ConfirmModal
          name={deleteTarget.name}
          loading={deleteMutation.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
      {modal !== null && (
        <StaffModal
          member={modal === 'add' ? null : modal}
          branches={branches}
          fixedBranch={null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">Staff Management</p>
          <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage clinic staff across all branches.</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff',   value: meta.total,                      icon: '👥' },
          { label: 'Active',        value: meta.active,                     icon: '✅' },
          { label: 'Dentists',      value: byRole['dentist']         || 0,  icon: '🦷' },
          { label: 'Receptionists', value: byRole['receptionist']    || 0,  icon: '💁' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '—' : c.value}</p>
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, or phone..."
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setRoleFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${roleFilter === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >All</button>
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => setRoleFilter(r.value === roleFilter ? '' : r.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${roleFilter === r.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading staff...</div>}
      {isError   && <div className="text-center py-16 text-red-500 text-sm">Failed to load staff.</div>}

      {!isLoading && !isError && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                        {initials(s.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.branch?.name || 'All branches'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {roleLabel[s.role] ?? s.role}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>📞 {s.phone}</p>
                  {s.email && <p>✉️ {s.email}</p>}
                  {s.working_days && <p>📅 {s.working_days}{s.time_window ? ` · ${s.time_window}` : ''}</p>}
                  {s.specialization && <p>🏥 {s.specialization}</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setModal(s)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">Edit</button>
                  <button onClick={() => setDeleteTarget(s)} className="flex-1 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-600 hover:bg-red-50">Remove</button>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="col-span-3 py-10 text-center text-gray-400 text-sm">No staff members found.</div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Staff List</h2>
              <p className="text-xs text-gray-400 mt-0.5">{staff.length} members</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                    {['Name', 'Role', 'Branch', 'Phone', 'Email', 'Working Days', 'Hours', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {s.photo_url
                            ? <img src={s.photo_url} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                            : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{initials(s.name)}</div>
                          }
                          <span className="font-semibold text-gray-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {roleLabel[s.role] ?? s.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{s.branch?.name || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{s.phone}</td>
                      <td className="px-5 py-3 text-gray-400">{s.email || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{s.working_days || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{s.time_window || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => setModal(s)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                          <button onClick={() => setDeleteTarget(s)} className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">No staff members found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}