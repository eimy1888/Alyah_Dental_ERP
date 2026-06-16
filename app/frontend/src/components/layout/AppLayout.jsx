import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ChevronLeft, ChevronRight, ChevronDown,
  LogOut, Bell, Search, Settings,
  LayoutDashboard, Users, CalendarDays, ListTodo,
  Receipt, Package, BarChart3, TrendingUp, FileText,
  UserRound, Building2, UserCog, Wallet, ClipboardList,
  X, FlaskConical,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/axiosInstance';

// ── Ethiopian Traditional Time clock ─────────────────────────────────────────
function getETT() {
  const now = new Date();
  const h   = now.getHours();
  const m   = now.getMinutes().toString().padStart(2, '0');
  const ett = ((h - 6 + 24) % 24);
  const d12 = ett % 12 === 0 ? 12 : ett % 12;
  const period = h >= 6 && h < 12 ? 'ጥዋት' : h >= 12 && h < 18 ? 'ቀን' : h >= 18 ? 'ምሽት' : 'ሌሊት';
  return `${d12}:${m} ${period}`;
}
function useETTClock() {
  const [t, setT] = useState(getETT());
  useEffect(() => { const iv = setInterval(() => setT(getETT()), 30000); return () => clearInterval(iv); }, []);
  return t;
}

/* ── Nav config ────────────────────────────────────────────────────────────── */
const NAV_CONFIG = {
  clinic_admin: [
    { label: 'Dashboard',  to: '/admin/dashboard',  icon: LayoutDashboard },
    { label: 'Branches',   to: '/admin/branches',   icon: Building2 },
    { label: 'Staff',      to: '/admin/staff',       icon: UserCog },
    { label: 'Dentists',   to: '/admin/dentists',    icon: Users },
    { label: 'Billing',    to: '/admin/billing',     icon: Receipt },
    { label: 'Finance',    to: '/admin/finance',     icon: TrendingUp },
    { label: 'Inventory',  to: '/admin/inventory',   icon: Package },
    { label: 'Reports',    to: '/admin/reports',     icon: BarChart3 },
    { label: 'Audit Log',  to: '/admin/audit-log',   icon: ClipboardList },
    { label: 'Settings',   to: '/admin/settings',    icon: Settings },
  ],
  branch_manager: [
    { label: 'Dashboard',    to: '/manager/dashboard',    icon: LayoutDashboard },
    { label: 'Staff',        to: '/manager/staff',         icon: Users },
    { label: 'Patients',     to: '/manager/patients',      icon: UserRound },
    { label: 'Appointments', to: '/manager/appointments',  icon: CalendarDays },
    { label: 'Waitlist',     to: '/manager/waitlist',      icon: ClipboardList },
    { label: 'Inventory',    to: '/manager/inventory',     icon: Package },
    { label: 'Report',       to: '/manager/report',        icon: BarChart3 },
    { label: 'Settings',     to: '/manager/setting',       icon: Settings },
  ],
  dentist: [
    { label: 'Dashboard',       to: '/dentist/dashboard',       icon: LayoutDashboard },
    { label: 'My Appointments', to: '/dentist/appointments',    icon: CalendarDays },
    { label: 'Patients',        to: '/dentist/patients',        icon: Users },
    { label: 'Medical Records', to: '/dentist/medical-records', icon: FileText },
    { label: 'Settings',        to: '/dentist/settings',        icon: Settings },
  ],
  receptionist: [
    { label: 'Dashboard',    to: '/receptionist/dashboard',    icon: LayoutDashboard },
    { label: 'Patients',     to: '/receptionist/patients',     icon: Users },
    { label: 'Appointments', to: '/receptionist/appointments', icon: CalendarDays },
    { label: 'Waitlist',     to: '/receptionist/waitlist',     icon: ListTodo },
    { label: 'Billing',      to: '/receptionist/billing',      icon: Receipt },
    { label: 'Settings',     to: '/receptionist/settings',     icon: Settings },
  ],
  accountant: [
    { label: 'Dashboard', to: '/accountant/dashboard', icon: LayoutDashboard },
    { label: 'Revenue',   to: '/accountant/revenue',   icon: TrendingUp },
    { label: 'Expenses',  to: '/accountant/expenses',  icon: Wallet },
    { label: 'Billing',   to: '/accountant/billing',   icon: Receipt },
    { label: 'Reports',   to: '/accountant/reports',   icon: FileText },
    { label: 'Settings',  to: '/accountant/settings',  icon: Settings },
  ],
  patient: [
    { label: 'Dashboard',       to: '/patient/dashboard',       icon: LayoutDashboard },
    { label: 'Appointments',    to: '/patient/appointments',    icon: CalendarDays },
    { label: 'Billing',         to: '/patient/billing',         icon: Receipt },
    { label: 'Medical Records', to: '/patient/medical-records', icon: FileText },
    { label: 'Settings',        to: '/patient/settings',        icon: Settings },
  ],
  lab_technician: [
    { label: 'Dashboard',  to: '/lab/dashboard', icon: LayoutDashboard },
    { label: 'Lab Orders', to: '/lab/orders',    icon: FlaskConical },
    { label: 'Settings',   to: '/lab/settings',  icon: Settings },
  ],
};

const ROLE_LABELS = {
  clinic_admin:   'Clinic Admin',
  branch_manager: 'Branch Manager',
  dentist:        'Dentist',
  receptionist:   'Receptionist',
  accountant:     'Accountant',
  patient:        'Patient',
  lab_technician: 'Lab Technician',
};

const ROLE_ACCENT = {
  clinic_admin:   'Clinic Management',
  branch_manager: 'Branch Operations',
  dentist:        'Clinical',
  receptionist:   'Front Desk',
  accountant:     'Finance',
  patient:        'Patient Portal',
  lab_technician: 'Lab Department',
};

/* Role→ gradient for sidebar top accent */
const ROLE_GRADIENT = {
  clinic_admin:   'from-blue-600 to-cyan-500',
  branch_manager: 'from-violet-600 to-purple-500',
  dentist:        'from-teal-600 to-emerald-500',
  receptionist:   'from-sky-600 to-blue-500',
  accountant:     'from-amber-500 to-orange-500',
  patient:        'from-rose-500 to-pink-500',
  lab_technician: 'from-indigo-600 to-violet-500',
};

const NOTIF_COUNT_ROUTES = {
  clinic_admin:   null,
  branch_manager: '/manager/notifications/count',
  dentist:        '/dentist/notifications/count',
  receptionist:   '/receptionist/notifications/count',
  accountant:     '/accountant/notifications/count',
  patient:        '/patient/notifications/count',
  lab_technician: '/lab/notifications/count',
};
const NOTIF_LIST_ROUTES = {
  branch_manager: '/manager/notifications',
  dentist:        '/dentist/notifications',
  receptionist:   '/receptionist/notifications',
  accountant:     '/accountant/notifications',
  patient:        '/patient/notifications',
};
const NOTIF_NAVIGATION = {
  appointment_booked:    (r) => r === 'receptionist' ? '/receptionist/appointments' : '/appointments',
  appointment_confirmed: (r) => r === 'patient'      ? '/patient/appointments' : '/appointments',
  invoice_created:       (r) => r === 'accountant'   ? '/accountant/billing' : r === 'patient' ? '/patient/billing' : '/billing',
  default:               ()  => '#',
};

/* ── Sidebar nav item ──────────────────────────────────────────────────────── */
function NavItem({ label, to, icon: Icon, collapsed }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
        transition-all duration-150 relative
        ${isActive
          ? 'bg-white/[0.14] text-white shadow-sm'
          : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
        }
        ${collapsed ? 'justify-center' : ''}
        `
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-white/70" />
          )}
          <Icon className={`w-[17px] h-[17px] shrink-0 ${collapsed ? '' : ''}`} />
          {!collapsed && <span className="leading-none">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const role       = user?.role ?? 'receptionist';
  const navItems   = NAV_CONFIG[role]  ?? [];
  const roleLabel  = ROLE_LABELS[role] ?? 'User';
  const roleAccent = ROLE_ACCENT[role] ?? '';
  const gradient   = ROLE_GRADIENT[role] ?? 'from-blue-600 to-cyan-500';

  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [notifCount,  setNotifCount]  = useState(0);
  const [notifs,      setNotifs]      = useState([]);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [notifLoad,   setNotifLoad]   = useState(false);
  const [branches,    setBranches]    = useState([]);
  const [selBranch,   setSelBranch]   = useState('');
  const [ctxName,     setCtxName]     = useState('');
  const notifRef = useRef(null);

  /* context */
  useEffect(() => {
    const clinicName = user?.clinic?.name ?? '';
    const branchName = user?.branch?.name ?? '';
    if (role === 'clinic_admin') {
      setCtxName(clinicName);
      apiClient.get('/admin/branches').then(r => {
        const list = r.data?.data ?? [];
        setBranches(list);
        if (list.length > 0) setSelBranch(String(list[0].id));
      }).catch(() => {});
    } else {
      setCtxName(branchName || clinicName);
    }
  }, [role, user]);

  /* notif count poll */
  useEffect(() => {
    const route = NOTIF_COUNT_ROUTES[role];
    if (!route) return;
    const fetch = async () => {
      try {
        const r = await apiClient.get(route);
        setNotifCount(r.data?.count ?? r.data?.data?.count ?? r.data?.unread ?? 0);
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, [role]);

  /* outside click */
  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* close mobile on nav */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const segment = location.pathname.split('/').filter(Boolean).pop();
  const pageLabel = navItems.find(n => n.to.endsWith('/' + segment) || n.to === location.pathname)?.label ?? roleLabel;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : roleLabel.slice(0, 2).toUpperCase();

  const handleLogout = () => logout();

  const handleBellClick = async () => {
    if (showNotifs) { setShowNotifs(false); return; }
    setShowNotifs(true);
    const route = NOTIF_LIST_ROUTES[role];
    if (!route) return;
    setNotifLoad(true);
    try {
      const r = await apiClient.get(route);
      let list = r.data?.data?.data ?? r.data?.data ?? r.data?.notifications ?? (Array.isArray(r.data) ? r.data : []);
      setNotifs(list);
      setNotifCount(r.data?.unread ?? r.data?.data?.unread ?? 0);
    } catch { setNotifs([]); }
    finally { setNotifLoad(false); }
  };

  const handleNotifClick = async (n) => {
    setShowNotifs(false);
    const route = NOTIF_LIST_ROUTES[role];
    if (route && n.id) {
      try { await apiClient.put(`${route}/${n.id}/read`); } catch {}
      setNotifs(prev => prev.filter(x => x.id !== n.id));
      setNotifCount(prev => Math.max(0, prev - 1));
    }
    const fn = NOTIF_NAVIGATION[n.type] || NOTIF_NAVIGATION.default;
    const url = n.action_url || fn(role);
    if (url && url !== '#') navigate(url);
  };

  const handleMarkAllRead = async () => {
    const route = NOTIF_LIST_ROUTES[role];
    if (!route) return;
    try { await apiClient.put(`${route}/read-all`); } catch {}
    setNotifs([]); setNotifCount(0);
  };

  const hasNotifs  = !!NOTIF_COUNT_ROUTES[role];
  const settingsTo = navItems.find(n => n.label === 'Settings')?.to;
  const ettTime    = useETTClock();

  /* ── Sidebar JSX (shared between desktop + mobile) ── */
  const SidebarContent = (
    <div className="flex flex-col h-full">

      {/* Logo + brand */}
      <div className={`flex items-center gap-3 px-4 py-[18px] border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        {/* Icon mark */}
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#051525] flex items-center justify-center shrink-0 shadow-lg border border-white/10">
          <img src="/brand/alyah-logo-icon.svg" alt="Alyah" className="w-7 h-7 object-contain" />
        </div>
        {!collapsed && (
          <img src="/brand/alyah-logo-white.svg" alt="Alyah Dental ERP" className="h-8 w-auto object-contain object-left" />
        )}
      </div>

      {/* User context block */}
      {!collapsed && (
        <div className="mx-3 mt-4 mb-2 rounded-xl bg-white/[0.07] border border-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
              <span className="text-[11px] font-black text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-white leading-none truncate">{user?.name ?? roleLabel}</p>
              <p className="text-[10px] text-white/40 mt-0.5 truncate">{ctxName || roleLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav section label */}
      {!collapsed && (
        <p className="px-5 pt-4 pb-1.5 text-[9px] font-black tracking-[0.18em] text-white/25 uppercase">Menu</p>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, to, icon }) => (
          <NavItem key={to} label={label} to={to} icon={icon} collapsed={collapsed} />
        ))}
      </nav>

      {/* Logout */}
      <div className={`px-2 py-3 border-t border-white/10`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-[17px] h-[17px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex">

      {/* Mobile backdrop — animated */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-[#0D1B2A] shrink-0 transition-all duration-300 relative ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
        {SidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center z-10 hover:bg-gray-50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
        </button>
      </aside>

      {/* Mobile sidebar — animated slide-in */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed left-0 top-0 z-50 h-full w-[240px] flex flex-col bg-[#0D1B2A] shadow-2xl md:hidden"
          >
            {SidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top nav */}
        <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-20"
          style={{ boxShadow: '0 1px 0 #e2e8f0', backdropFilter: 'blur(8px)' }}>

          <div className="flex items-center gap-3">
            {/* Mobile burger */}
            <button className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(v => !v)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search patients, records…"
                className="bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none w-full" />
            </div>

            {/* Breadcrumb + ETT clock */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-[13px]">
                <span className="text-gray-400">{roleLabel}</span>
                <span className="text-gray-300">/</span>
                <span className="font-semibold text-gray-800">{pageLabel}</span>
              </div>
              {/* Ethiopian time badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-blue-600">{ettTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">

            {/* Branch selector (clinic admin) */}
            {role === 'clinic_admin' && branches.length > 0 && (
              <div className="relative hidden md:block">
                <select value={selBranch} onChange={e => setSelBranch(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200 bg-white text-[12px] font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            )}

            {/* Branch label (non-admin) */}
            {role !== 'clinic_admin' && role !== 'patient' && ctxName && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span className="text-[12px] font-semibold text-gray-700 max-w-[100px] truncate">
                  {user?.branch?.name ?? ctxName}
                </span>
              </div>
            )}

            {/* Notification bell */}
            {hasNotifs && (
              <div className="relative" ref={notifRef}>
                <button onClick={handleBellClick}
                  className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
                  <Bell className="w-4 h-4" />
                  {notifCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                    >
                      {notifCount > 9 ? '9+' : notifCount}
                    </motion.span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifs && (
                    <motion.div
                      key="notif-dropdown"
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-[13px] font-bold text-gray-900">Notifications</p>
                        <div className="flex items-center gap-2">
                          {notifCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[11px] text-blue-600 font-semibold hover:text-blue-700">
                              Mark all read
                            </button>
                          )}
                          <button onClick={() => setShowNotifs(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifLoad ? (
                          <div className="py-8 flex justify-center">
                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                          </div>
                        ) : notifs.length === 0 ? (
                          <div className="py-8 text-center">
                            <p className="text-[13px] text-gray-400">No new notifications</p>
                          </div>
                        ) : notifs.map((n, i) => (
                          <motion.div
                            key={n.id ?? i}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => handleNotifClick(n)}
                            className={`px-4 py-3 cursor-pointer transition-colors flex items-start gap-3 ${!n.read_at ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-gray-50'}`}
                          >
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read_at ? 'bg-blue-500' : 'bg-gray-300'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-semibold text-gray-900 truncate">{n.title ?? 'Notification'}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Settings */}
            {settingsTo && (
              <button onClick={() => navigate(settingsTo)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" title="Settings">
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-1">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                <span className="text-[11px] font-black text-white">{initials}</span>
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-[12px] font-bold text-gray-800">{user?.name ?? roleLabel}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{roleLabel}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Page content — animated on route change */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
