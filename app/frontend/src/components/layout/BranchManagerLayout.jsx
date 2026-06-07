import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserRound, CalendarDays,
  ClipboardList, Package, BarChart3, Settings,
  Heart, ChevronLeft, ChevronRight, Bell, Search, LogOut,
  ChevronDown,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NAV_ITEMS = [
  { label: 'Dashboard',    to: '/manager/dashboard',   icon: LayoutDashboard },
  { label: 'Staff',        to: '/manager/staff',        icon: Users },
  { label: 'Patients',     to: '/manager/patients',     icon: UserRound },
  { label: 'Appointments', to: '/manager/appointments', icon: CalendarDays },
  { label: 'Waitlist',     to: '/manager/waitlist',     icon: ClipboardList },
  { label: 'Inventory',    to: '/manager/inventory',    icon: Package },
  { label: 'Report',       to: '/manager/report',       icon: BarChart3 },
  { label: 'Settings',     to: '/manager/setting',      icon: Settings },
];

// Map route segment → readable page name
const PAGE_LABELS = {
  dashboard:    'Dashboard',
  staff:        'Staff',
  patients:     'Patients',
  appointments: 'Appointments',
  waitlist:     'Waitlist',
  inventory:    'Inventory',
  report:       'Report',
  setting:      'Settings',
};

export default function BranchManagerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout }          = useAuthStore();
  const navigate                  = useNavigate();
  const location                  = useLocation();

  // Derive current page label from URL
  const segment   = location.pathname.split('/').filter(Boolean).pop();
  const pageLabel = PAGE_LABELS[segment] ?? 'Page';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'BM';

  // Real data from auth store — populated by AuthService.buildUserResponse()
  const clinicName    = user?.clinic?.name     ?? '—';
  const branchName    = user?.branch?.name     ?? '—';
  const branchLocation = user?.branch?.location ?? '';
  const roleName      = 'Branch Manager';

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className={`
          relative flex flex-col bg-[#0f1f35] shrink-0 transition-all duration-300
          ${collapsed ? 'w-[68px]' : 'w-[260px]'}
        `}
      >
        {/* Logo */}
        <div className={`
          flex items-center gap-3 px-4 py-5 border-b border-white/10
          ${collapsed ? 'justify-center' : ''}
        `}>
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-xs font-bold text-white leading-none">Alyah</p>
              <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase leading-none mt-0.5">
                Dental ERP
              </p>
            </div>
          )}
        </div>

        {/* Role + Clinic + Location block */}
        {!collapsed && (
          <div className="px-4 pt-5 pb-3 border-b border-white/10">
            {/* Role pill */}
            <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">
              {roleName}
            </p>
            {/* Clinic name */}
            <p className="text-sm font-bold text-white leading-snug truncate">
              {clinicName}
            </p>
            {/* Location */}
            {branchLocation && (
              <p className="text-[11px] text-white/40 mt-0.5 truncate">
                {branchLocation}
              </p>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
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

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center z-10 hover:bg-gray-50 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-500" />
            : <ChevronLeft  className="w-3 h-3 text-gray-500" />
          }
        </button>

        {/* User + Logout */}
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-none truncate">
                    {user?.name ?? 'Branch Manager'}
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">{roleName}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">

          {/* Left — breadcrumb: Role / Current Page */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-400 font-medium">{roleName}</span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-800">{pageLabel}</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-52">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Clinic name badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-xs font-semibold text-blue-700 truncate max-w-[140px]">
                {clinicName}
              </span>
            </div>

            {/* Branch selector (display only for now) */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white cursor-default">
              <span className="text-xs text-gray-500 font-medium">Branch</span>
              <span className="text-xs font-bold text-gray-800 truncate max-w-[100px]">
                {branchName}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('/manager/setting')}
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