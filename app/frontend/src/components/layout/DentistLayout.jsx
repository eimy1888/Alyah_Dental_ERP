import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, FileText, Settings,
  LogOut, Search, ChevronLeft, ChevronRight, Heart,
  Bell, Settings2, ChevronDown,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import {
  getNotificationCount,
  getNotifications,
  markNotificationsRead,
} from '../../services/dentistService';

const NAV_ITEMS = [
  { label: 'Dashboard',       to: '/dentist/dashboard',       icon: LayoutDashboard },
  { label: 'My Appointments', to: '/dentist/appointments',    icon: CalendarDays },
  { label: 'Patients',        to: '/dentist/patients',        icon: Users },
  { label: 'Medical Records', to: '/dentist/medical-records', icon: FileText },
  { label: 'Settings',        to: '/dentist/settings',        icon: Settings },
];

const PAGE_LABELS = {
  dashboard:        'Dashboard',
  appointments:     'My Appointments',
  patients:         'Patients',
  'medical-records': 'Medical Records',
  settings:         'Settings',
};

export default function DentistLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [collapsed,    setCollapsed]    = useState(false);
  const [notifCount,   setNotifCount]   = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  // Real data from auth store — populated by AuthController + useAuth fix
  const clinicName     = user?.clinic?.name     ?? '—';
  const branchName     = user?.branch?.name     ?? '—';
  const branchLocation = user?.branch?.location ?? '';
  const roleName       = 'Dentist';

  // Derive current page label from URL
  const segment   = location.pathname.split('/').filter(Boolean).pop();
  const pageLabel = PAGE_LABELS[segment] ?? 'Page';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  // Poll notification count every 30 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getNotificationCount();
        setNotifCount(data.count ?? 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notif dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#notif-dropdown')) setShowNotifs(false);
    };
    if (showNotifs) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const handleBellClick = async () => {
    if (showNotifs) { setShowNotifs(false); return; }
    setShowNotifs(true);
    setNotifLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications ?? []);
      const ids = (data.notifications ?? []).map((n) => n.id);
      if (ids.length > 0) {
        await markNotificationsRead(ids);
        setNotifCount(0);
      }
    } catch {}
    finally { setNotifLoading(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
            <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">
              {roleName}
            </p>
            <p className="text-sm font-bold text-white leading-snug truncate">
              {clinicName}
            </p>
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
                    {user?.name ?? 'Dentist'}
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

            {/* Branch display */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white">
              <span className="text-xs text-gray-500 font-medium">Branch</span>
              <span className="text-xs font-bold text-gray-800 truncate max-w-[100px]">
                {branchName}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </div>

            {/* Notification Bell */}
            <div className="relative" id="notif-dropdown">
              <button
                onClick={handleBellClick}
                className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    <button
                      onClick={() => { setShowNotifs(false); navigate('/dentist/appointments'); }}
                      className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                    >
                      View appointments →
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifLoading ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">No new notifications</div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => { setShowNotifs(false); navigate('/dentist/appointments'); }}
                          className="px-4 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-800">
                            New appointment for {notif.patient_name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {notif.type} · {notif.date} at {notif.time}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Tap to view appointments →
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate('/dentist/settings')}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-none">
                  {user?.name ?? ''}
                </p>
                <p className="text-[10px] text-gray-400">{roleName}</p>
              </div>
            </div>

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