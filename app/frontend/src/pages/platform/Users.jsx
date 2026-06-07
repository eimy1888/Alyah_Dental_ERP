import { useState, useEffect } from 'react';
import { Search, Users, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { getUsers } from '../../services/platformService';

const roleColors = {
  platform_admin: 'bg-red-50 text-red-700 border border-red-200',
  clinic_admin:   'bg-blue-50 text-blue-700 border border-blue-200',
  branch_manager: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  accountant:     'bg-amber-50 text-amber-700 border border-amber-200',
  receptionist:   'bg-green-50 text-green-700 border border-green-200',
  dentist:        'bg-purple-50 text-purple-700 border border-purple-200',
};

const roleLabels = {
  platform_admin: 'Platform Admin',
  clinic_admin:   'Clinic Admin',
  branch_manager: 'Branch Manager',
  accountant:     'Accountant',
  receptionist:   'Receptionist',
  dentist:        'Dentist',
};

const statusColors = {
  active:    'bg-green-50 text-green-700 border border-green-200',
  suspended: 'bg-red-50 text-red-700 border border-red-200',
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
};

const ALL_ROLES = [
  'All',
  'clinic_admin',
  'branch_manager',
  'accountant',
  'receptionist',
  'dentist',
];

export default function PlatformUsers() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected,     setSelected]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getUsers();
        setUsers(res.data || []);
      } catch {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.clinic?.toLowerCase().includes(search.toLowerCase()) ||
      u.tenant?.name?.toLowerCase().includes(search.toLowerCase());

    const userRole   = u.role ?? u.roles?.[0]?.name ?? '';
    const userStatus = u.status ?? (u.is_active ? 'active' : 'suspended');

    const matchRole   = roleFilter   === 'All' || userRole   === roleFilter;
    const matchStatus = statusFilter === 'All' || userStatus === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const getRole = (u) => u.role ?? u.roles?.[0]?.name ?? 'clinic_admin';
  const getStatus = (u) => u.status ?? (u.is_active ? 'active' : 'suspended');
  const getClinic = (u) => u.clinic ?? u.tenant?.name ?? '—';
  const getCity   = (u) => u.city   ?? u.tenant?.city ?? '—';
  const getJoined = (u) => {
    const raw = u.joined ?? u.created_at;
    if (!raw) return '—';
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const counts = {
    total:     users.length,
    active:    users.filter((u) => getStatus(u) === 'active').length,
    suspended: users.filter((u) => getStatus(u) === 'suspended').length,
    pending:   users.filter((u) => getStatus(u) === 'pending').length,
  };

  const roleCounts = Object.fromEntries(
    ALL_ROLES.filter((r) => r !== 'All').map((r) => [
      r,
      users.filter((u) => getRole(u) === r).length,
    ])
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Platform Admin
        </p>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide visibility of all staff accounts across every clinic tenant.
        </p>
      </div>

      {/* View-only notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          <span className="font-semibold">View-only access.</span>{' '}
          User management for clinics is handled by Clinic Admins.
          Platform Admin can monitor all users but cannot create, edit, or delete clinic staff accounts.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: counts.total,     bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'Active',      value: counts.active,    bg: 'bg-green-50',  color: 'text-green-600' },
          { label: 'Suspended',   value: counts.suspended, bg: 'bg-red-50',    color: 'text-red-600' },
          { label: 'Pending',     value: counts.pending,   bg: 'bg-amber-50',  color: 'text-amber-600' },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search users, clinics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
        >
          <option value="All">All roles</option>
          {ALL_ROLES.filter((r) => r !== 'All').map((r) => (
            <option key={r} value={r}>{roleLabels[r]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
        >
          {['All', 'active', 'suspended', 'pending'].map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table + detail panel */}
      <div className="flex gap-4">

        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">All Users</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['USER', 'ROLE', 'CLINIC', 'CITY', 'JOINED', 'STATUS'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const role   = getRole(u);
                  const status = getStatus(u);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelected(selected?.id === u.id ? null : u)}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                        selected?.id === u.id ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {u.name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{u.name}</p>
                            <p className="text-[10px] text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {roleLabels[role] ?? role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{getClinic(u)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{getCity(u)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{getJoined(u)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="w-64 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 text-xl font-bold flex items-center justify-center mb-3">
                {selected.name?.charAt(0) ?? '?'}
              </div>
              <p className="text-sm font-bold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{selected.email}</p>
              <span className={`mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleColors[getRole(selected)] ?? 'bg-gray-100 text-gray-600'}`}>
                {roleLabels[getRole(selected)] ?? getRole(selected)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: 'Clinic',  value: getClinic(selected) },
                { label: 'City',    value: getCity(selected) },
                { label: 'Joined',  value: getJoined(selected) },
                { label: 'Status',  value: getStatus(selected).charAt(0).toUpperCase() + getStatus(selected).slice(1) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-relaxed">
                User actions are managed by the Clinic Admin of{' '}
                <span className="font-semibold">{getClinic(selected)}</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-64 shrink-0 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center">
            <Users className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">Select a user</p>
            <p className="text-xs text-gray-300 mt-1">Click any row to view details.</p>
          </div>
        )}
      </div>

      {/* Role distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Role Distribution</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ALL_ROLES.filter((r) => r !== 'All').map((role) => (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'All' : role)}
              className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                roleFilter === role ? 'border-blue-300 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <p className="text-xl font-bold text-gray-900">{roleCounts[role]}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{roleLabels[role]}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}