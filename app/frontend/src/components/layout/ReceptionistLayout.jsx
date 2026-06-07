import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, ListTodo,
  Receipt, Settings, LogOut, Bell, Menu, X,
  ChevronLeft, ChevronRight, Heart
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getBranchInfo, getNotificationCount } from '../../services/receptionistService';

const NAV_ITEMS = [
  { label: 'Dashboard',    to: '/receptionist/dashboard',    icon: LayoutDashboard },
  { label: 'Patients',     to: '/receptionist/patients',     icon: Users },
  { label: 'Appointments', to: '/receptionist/appointments', icon: CalendarDays },
  { label: 'Waitlist',     to: '/receptionist/waitlist',     icon: ListTodo },
  { label: 'Billing',      to: '/receptionist/billing',      icon: Receipt },
  { label: 'Settings',     to: '/receptionist/settings',     icon: Settings },
];

export default function ReceptionistLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed]               = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]     = useState(false);
  const [branchInfo, setBranchInfo]             = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load branch info once
  useEffect(() => {
    getBranchInfo()
      .then(setBranchInfo)
      .catch(() => {});
  }, []);

  // Poll notification count every 30s
  useEffect(() => {
    const fetch = () =>
      getNotificationCount()
        .then((n) => setNotificationCount(typeof n === 'number' ? n : n?.count ?? 0))
        .catch(() => {});

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = () => {
    setShowNotifications(false);
    navigate('/receptionist/appointments');
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 h-full bg-[#1a3a5c] shadow-xl transition-all duration-300
        ${collapsed ? 'w-20' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                <Heart className="h-4 w-4 fill-white text-white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-white">Aylah Dental</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
                  Front Desk
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white md:block"
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Clinic & branch info */}
        {!collapsed && (
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-xs font-semibold text-white">
              {branchInfo?.name ?? 'Loading...'}
            </p>
            <p className="truncate text-[10px] text-blue-300">
              {branchInfo?.location ?? ''}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="mt-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : ''}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'}
                ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-6 left-0 right-0 px-3">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
              text-white/70 transition-all duration-200 hover:bg-white/5 hover:text-white
              ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>

        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Branch title */}
            <div className="flex-1 md:ml-0">
              <p className="text-sm font-semibold text-gray-800">
                {branchInfo?.name ?? 'Front Desk'}
              </p>
              <p className="text-xs text-gray-400">
                {branchInfo?.location ?? 'Addis Ababa'} · Receptionist
              </p>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">

              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center
                      justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border
                    border-gray-100 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                      {notificationCount > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs
                          font-semibold text-blue-700">
                          {notificationCount} today
                        </span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notificationCount > 0 ? (
                        <button
                          onClick={handleNotificationClick}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left
                            hover:bg-gray-50 transition-colors"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                            rounded-lg bg-blue-50">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {notificationCount} appointment{notificationCount > 1 ? 's' : ''} today
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Pending or confirmed · Click to view
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User avatar */}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full
                  bg-blue-100 text-sm font-bold text-blue-700">
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'R'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800">{user?.name ?? 'Receptionist'}</p>
                  <p className="text-xs text-gray-400">Receptionist</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}