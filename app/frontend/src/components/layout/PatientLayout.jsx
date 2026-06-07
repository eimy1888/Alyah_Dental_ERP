import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, FileText, Settings,
  LogOut, Menu, X, ChevronLeft, ChevronRight,
  Heart, Bell, ShieldCheck, MapPin, Building2, Clock,
  CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import {
  getClinicInfo,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/patientService';

const NAV_ITEMS = [
  { label: 'My Dashboard',       to: '/patient/dashboard',       icon: LayoutDashboard },
  { label: 'My Appointments',    to: '/patient/appointments',    icon: CalendarDays },
  { label: 'My Medical Records', to: '/patient/medical-records', icon: FileText },
  { label: 'Settings',           to: '/patient/settings',        icon: Settings },
];

const statusIcon = {
  confirmed:   <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  pending:     <Clock className="w-3.5 h-3.5 text-amber-500" />,
  completed:   <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
  cancelled:   <XCircle className="w-3.5 h-3.5 text-red-500" />,
  in_progress: <AlertCircle className="w-3.5 h-3.5 text-purple-500" />,
  checked_in:  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />,
};

const PAGE_TITLES = {
  '/patient/dashboard':       'Dashboard',
  '/patient/appointments':    'My Appointments',
  '/patient/medical-records': 'My Medical Records',
  '/patient/settings':        'Settings',
};

export default function PatientLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();

  const [collapsed,      setCollapsed]      = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [clinicInfo,     setClinicInfo]     = useState(null);
  const [notifications,  setNotifications]  = useState([]);
  const [unread,         setUnread]         = useState(0);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const notifRef = useRef(null);

  const currentPage = PAGE_TITLES[location.pathname] ?? 'Patient Portal';
  const breadcrumb  = `Patient Portal / ${currentPage}`;

  // Load clinic info
  useEffect(() => {
    getClinicInfo()
      .then(setClinicInfo)
      .catch(() => {});
  }, []);

  // Load notifications
  const loadNotifications = () => {
    getNotifications()
      .then((res) => {
        setNotifications(res.data ?? []);
        setUnread(res.unread ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`
        fixed left-0 top-0 z-50 h-full bg-[#0f1f35] flex flex-col
        transition-all duration-300 shadow-xl
        ${collapsed ? 'w-[68px]' : 'w-[260px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
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

        {/* Workspace label */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-2 border-b border-white/10">
            <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1">
              Patient Portal
            </p>
            {clinicInfo ? (
              <>
                <p className="text-sm font-semibold text-white truncate">
                  {clinicInfo.clinic?.name ?? '—'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                  <p className="text-[10px] text-white/40 truncate">
                    {clinicInfo.branch?.location ?? clinicInfo.clinic?.address ?? 'Addis Ababa, Ethiopia'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-white/30">Loading...</p>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
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
            : <ChevronLeft className="w-3 h-3 text-gray-500" />
          }
        </button>

        {/* User + Logout */}
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-none truncate">
                    {user?.name ?? 'Patient'}
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">Patient</p>
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

      {/* ── Main ────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        collapsed ? 'md:ml-[68px]' : 'md:ml-[260px]'
      }`}>

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">

          {/* Left — mobile hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div>
              <p className="text-xs text-gray-400 hidden sm:block">{breadcrumb}</p>
              <p className="text-sm font-bold text-gray-900">{currentPage}</p>
            </div>
          </div>

          {/* Right — clinic info + branch + notifications + settings */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Clinic + Branch — hidden on small screens */}
            {clinicInfo && (
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">
                    {clinicInfo.clinic?.name ?? '—'}
                  </span>
                </div>
                {clinicInfo.branch?.name && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Branch</span>
                    <span className="text-xs font-bold text-gray-800">
                      {clinicInfo.branch.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notifications bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Notifications</p>
                      {unread > 0 && (
                        <p className="text-xs text-gray-400">{unread} unread</p>
                      )}
                    </div>
                    {unread > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Bell className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && handleMarkRead(n.id)}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !n.is_read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {statusIcon[n.status] ?? <Bell className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                              {!n.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100 text-center">
                    <button
                      onClick={() => { setNotifOpen(false); navigate('/patient/appointments'); }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View all appointments →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings shortcut */}
            <button
              onClick={() => navigate('/patient/settings')}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              title="Settings"
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