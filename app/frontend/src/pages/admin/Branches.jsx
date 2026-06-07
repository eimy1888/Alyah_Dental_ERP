import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/axiosInstance';

// ── API helpers ───────────────────────────────────────────────────────────────
const fetchBranches = (search) =>
  apiClient.get('/admin/branches', { params: { search } }).then(r => r.data);

const fetchBranchManagers = () =>
  apiClient.get('/admin/staff', { params: { role: 'Branch Manager', per_page: 100 } })
    .then(r => {
      const payload = r.data;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.data?.data)) return payload.data.data;
      if (Array.isArray(payload)) return payload;
      return [];
    });

const createBranch = (data) =>
  apiClient.post('/admin/branches', data).then(r => r.data);

const updateBranch = ({ id, ...data }) =>
  apiClient.put(`/admin/branches/${id}`, data).then(r => r.data);

const deleteBranch = (id) =>
  apiClient.delete(`/admin/branches/${id}`).then(r => r.data);

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor = {
  active:      'bg-green-100 text-green-700',
  soft_launch: 'bg-amber-100 text-amber-700',
  inactive:    'bg-gray-100 text-gray-500',
};

const statusLabel = {
  active:      'Active',
  soft_launch: 'Soft Launch',
  inactive:    'Inactive',
};

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
      <span>✅</span>
      <span className="text-sm">{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function BranchModal({ branch, onClose, onSave }) {
  const navigate = useNavigate();
  const isEdit   = !!branch;

  const defaultWorkingHours = {
    monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
  };

  const [form, setForm] = useState({
    name:         branch?.name         || '',
    location:     branch?.location     || '',
    phone:        branch?.phone        || '',
    email:        branch?.email        || '',
    manager_name: branch?.manager_name || '',
    manager_id:   branch?.manager_id   || '',
    status:       branch?.status       || 'active',
    working_hours: branch?.working_hours || { ...defaultWorkingHours },
    map_link:     branch?.map_link     || '',
  });
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ['branch-managers'],
    queryFn:  fetchBranchManagers,
    staleTime: 60000,
  });

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  const setWorkingHour = (day, value) => {
    setForm(p => ({
      ...p,
      working_hours: { ...p.working_hours, [day]: value }
    }));
  };

  const handleManagerSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      set('manager_id', '');
      set('manager_name', '');
      return;
    }
    const found = managers.find(m => String(m.id) === String(selectedId));
    set('manager_id', selectedId);
    set('manager_name', found ? found.name : '');
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Branch name is required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        ...form,
        manager_id: form.manager_id || null,
      };
      await onSave(isEdit ? { id: branch.id, ...payload } : payload);
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden my-8">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">
              Branch Management
            </p>
            <h2 className="text-white text-xl font-bold mt-0.5">
              {isEdit ? 'Edit Branch' : 'Add New Branch'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Modal body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {apiError}
            </div>
          )}

          {/* Branch name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Gerji Satellite"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Branch Manager */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Branch Manager
              </label>
              <button
                type="button"
                onClick={() => { onClose(); navigate('/admin/staff?add=branch_manager'); }}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> Add New Manager
              </button>
            </div>

            {loadingManagers ? (
              <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50">
                Loading managers...
              </div>
            ) : managers.length === 0 ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-amber-500 text-base mt-0.5">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-amber-700">No branch managers found</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Go to{' '}
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate('/admin/staff?add=branch_manager'); }}
                      className="underline font-semibold"
                    >
                      Staff page
                    </button>
                    {' '}to add a branch manager first, then come back to assign them.
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={form.manager_id}
                onChange={handleManagerSelect}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— No manager assigned —</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.branch_name ? ` (${m.branch_name})` : ' (unassigned)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Location
            </label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Bole, Addis Ababa"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+251 911..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
              <input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="branch@clinic.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Working Hours
            </label>
            <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50">
              {daysOfWeek.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-24 text-xs font-medium text-gray-600 capitalize">{dayLabels[day]}</span>
                  <input
                    value={form.working_hours?.[day] || ''}
                    onChange={(e) => setWorkingHour(day, e.target.value)}
                    placeholder="8:00 - 18:00"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Format: "8:00 - 18:00" or "Closed"</p>
          </div>

          {/* Google Maps Link */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Google Maps Link
            </label>
            <input
              value={form.map_link}
              onChange={e => set('map_link', e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Embed URL or share link for Google Maps</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="soft_launch">Soft Launch</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Branch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper to format working hours for display ────────────────────────────────
function formatWorkingHours(workingHours) {
  if (!workingHours) return null;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours = [];
  for (const day of days) {
    if (workingHours[day]) {
      hours.push(`${dayLabels[day]}: ${workingHours[day]}`);
    }
  }
  if (hours.length === 0) return null;
  if (hours.length <= 2) return hours.join(' • ');
  return `${hours[0]} • ${hours[1]} • +${hours.length - 2} more`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Branches() {
  const queryClient = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['branches', search],
    queryFn:  () => fetchBranches(search),
    staleTime: 30000,
  });

  const branches = data?.data  || [];
  const meta     = data?.meta  || { total: 0, active: 0 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['branches'] });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: (res) => { invalidate(); showToast(`Branch "${res.data.name}" created.`); },
  });

  const updateMutation = useMutation({
    mutationFn: updateBranch,
    onSuccess: (res) => { invalidate(); showToast(`Branch "${res.data.name}" updated.`); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => { invalidate(); showToast('Branch deleted.'); setDeleteTarget(null); },
  });

  const handleSave = (formData) =>
    formData.id
      ? updateMutation.mutateAsync(formData)
      : createMutation.mutateAsync(formData);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {modal && (
        <BranchModal
          branch={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Branch?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
            Branch Management
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage clinic branches across your locations.</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          <span className="text-lg leading-none">+</span> Add Branch
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Branches',  value: meta.total,               icon: '🏥' },
          { label: 'Active Branches', value: meta.active,              icon: '✅' },
          { label: 'Other Statuses',  value: meta.total - meta.active, icon: '⏸️' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {isLoading ? '—' : c.value}
                </p>
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search branches by name, manager, or location..."
            className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400 text-sm">Loading branches...</div>
      )}
      {isError && (
        <div className="text-center py-16 text-red-500 text-sm">
          Failed to load branches. Please refresh.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Branch cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {branches.map(b => (
              <div
                key={b.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-base">{b.name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[b.status]}`}>
                      {statusLabel[b.status]}
                    </span>
                  </div>
                  <p className="text-blue-200 text-xs mt-1">📍 {b.location || 'No location set'}</p>
                </div>

                <div className="p-5">
                  {b.manager_name && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {b.manager_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Branch Manager</p>
                        <p className="text-sm font-semibold text-gray-800">{b.manager_name}</p>
                      </div>
                    </div>
                  )}
                  {!b.manager_name && (
                    <p className="text-xs text-gray-400 mb-3 italic">No manager assigned</p>
                  )}
                  
                  {/* Working Hours Preview */}
                  {formatWorkingHours(b.working_hours) && (
                    <div className="mb-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
                      <p className="font-medium text-gray-600 mb-1">Hours:</p>
                      <p>{formatWorkingHours(b.working_hours)}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setModal(b)}
                      className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="flex-1 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {branches.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400 text-sm">
                No branches found. Add your first branch.
              </div>
            )}
          </div>

          {/* Branch table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Branch Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">{branches.length} branches</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                    {['Branch', 'Manager', 'Location', 'Phone', 'Hours', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800">{b.name}</td>
                      <td className="px-5 py-3 text-gray-600">{b.manager_name || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{b.location || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{b.phone || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs max-w-[200px] truncate">
                        {formatWorkingHours(b.working_hours) || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[b.status]}`}>
                          {statusLabel[b.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModal(b)}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(b)}
                            className="text-xs text-red-500 hover:underline font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}