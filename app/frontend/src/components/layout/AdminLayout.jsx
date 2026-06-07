import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Heart, LayoutDashboard, Receipt,
  TrendingUp, Package, Settings, ChevronLeft,
  ChevronRight, Bell, Search, LogOut, Building2,
  UserCog, BarChart3,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getBranches } from '../../services/clinicService';
import apiClient from '../../services/axiosInstance';

const NAV_ITEMS = [
  { label: 'Dashboard',    to: '/admin/dashboard',    icon: LayoutDashboard },
  { label: 'Branches',     to: '/admin/branches',     icon: Building2 },
  { label: 'Staff',        to: '/admin/staff',        icon: UserCog },
  { label: 'Billing',      to: '/admin/billing',      icon: Receipt },
  { label: 'Finance',      to: '/admin/finance',      icon: TrendingUp },
  { label: 'Inventory',    to: '/admin/inventory',    icon: Package },
  { label: 'Reports',      to: '/admin/reports',      icon: BarChart3 },
  { label: 'Settings',     to: '/admin/settings',     icon: Settings },
];

const ROLE_LABELS = {
  clinic_admin:   'Clinic Admin',
  branch_manager: 'Branch Manager',
  accountant:     'Accountant',
  dentist:        'Dentist',
};

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar({ collapsed, user, clinicName, clinicCity, onLogout }) {
  const roleLabel = ROLE_LABELS[user?.role] ?? 'Clinic Admin';
  const initials  = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CA';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-xs font-bold text-white leading-none">DentFlow</p>
            <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase leading-none mt-0.5">
              Dental ERP
            </p>
          </div>
        )}
      </div>

      {/* Clinic info */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1">
            {roleLabel}
          </p>
          <p className="text-xs font-semibold text-white truncate">
            {clinicName || '—'}
          </p>
          <p className="text-[10px] text-white/50 mt-0.5">
            {clinicCity || '—'}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-150
              ${isActive
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/8'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-none truncate">
                  {user?.name ?? 'Clinic Admin'}
                </p>
                <p className="text-[10px] text-white/50 mt-0.5 truncate">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Layout ──────────────────────────────────────────────
export default function AdminLayout() {
  const [collapsed, setCollapsed]           = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [clinicName, setClinicName]         = useState('');
  const [clinicCity, setClinicCity]         = useState('');
  const [branches, setBranches]             = useState([]);
  const { user, logout }                    = useAuthStore();
  const navigate                            = useNavigate();

  useEffect(() => {
    // GET /api/v1/clinic/settings → { success, data: { clinic: { name, city, ... } } }
    apiClient.get('/admin/settings')
      .then((res) => {
        const clinic = res.data?.data?.clinic ?? {};
        setClinicName(clinic.name ?? '');
        setClinicCity(clinic.city ?? '');
      })
      .catch(() => {}); // fail silently — layout still renders

    // GET /api/v1/admin/branches → real branch list for dropdown
    getBranches()
      .then((res) => {
        const list = res?.data ?? res ?? [];
        const arr  = Array.isArray(list) ? list : [];
        setBranches(arr);
        if (arr.length > 0) setSelectedBranch(String(arr[0].id));
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside
        className={`relative flex flex-col bg-[#0f1f35] shrink-0 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <Sidebar
          collapsed={collapsed}
          user={user}
          clinicName={clinicName}
          clinicCity={clinicCity}
          onLogout={handleLogout}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center z-10 hover:bg-gray-50 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-500" />
            : <ChevronLeft  className="w-3 h-3 text-gray-500" />
          }
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">

          {/* Left: breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-400">Clinic Admin</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-700 truncate max-w-[200px]">
              {clinicName || '—'}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Clinic badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white">
              <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Heart className="w-2.5 h-2.5 text-white fill-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 truncate max-w-[160px]">
                {clinicName || '—'}
              </span>
            </div>

            {/* Branch selector — real data */}
            {branches.length > 0 && (
              <div className="relative hidden md:block">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-3 h-3 text-gray-400 absolute right-2 top-2 pointer-events-none rotate-90" />
              </div>
            )}

            {/* Bell */}
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings shortcut */}
            <button
              onClick={() => navigate('/admin/settings')}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}