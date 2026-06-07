// src/components/layout/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, CalendarDays, FileText,
  X, ChevronRight, Settings, LogOut, Bell,
  Activity, Stethoscope, Package, BarChart3,
  ClipboardList, UserCog, Building2, CreditCard,
  Wallet, ShieldCheck, TrendingUp, FlaskConical,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';
import { useAuth } from '../../hooks/useAuth';

// ── Role-aware nav maps ───────────────────────────────────────────────────────
const NAV_MAPS = {
  receptionist: [
    { group: 'Workspace',    items: [
      { label:'Dashboard',    path:'/dashboard',    icon:LayoutDashboard,  route:'/dashboard' },
      { label:'Patients',     path:'/patients',     icon:Users,            route:'/patients' },
      { label:'Appointments', path:'/appointments', icon:CalendarDays,     route:'/appointments' },
      { label:'Waitlist',     path:'/waitlist',     icon:ClipboardList,    route:'/waitlist' },
    ]},
    { group: 'Finance', items: [
      { label:'Billing',      path:'/invoices',     icon:FileText,         route:'/invoices' },
    ]},
  ],
  dentist: [
    { group: 'Clinical', items: [
      { label:'Dashboard',       path:'/dashboard',        icon:LayoutDashboard, route:'/dashboard' },
      { label:'My Appointments', path:'/my-appointments',  icon:CalendarDays,    route:'/my-appointments' },
      { label:'Patients',        path:'/patients',         icon:Users,           route:'/patients' },
      { label:'Medical Records', path:'/medical-records',  icon:Activity,        route:'/medical-records' },
    ]},
  ],
  accountant: [
    { group: 'Finance', items: [
      { label:'Dashboard', path:'/dashboard',  icon:LayoutDashboard, route:'/dashboard' },
      { label:'Revenue',   path:'/revenue',    icon:TrendingUp,      route:'/revenue' },
      { label:'Billing',   path:'/billing',    icon:FileText,        route:'/billing' },
      { label:'Expenses',  path:'/expenses',   icon:Wallet,          route:'/expenses' },
      { label:'Reports',   path:'/reports',    icon:BarChart3,       route:'/reports' },
    ]},
  ],
  branch_manager: [
    { group: 'Management', items: [
      { label:'Dashboard',    path:'/dashboard',    icon:LayoutDashboard, route:'/dashboard' },
      { label:'Appointments', path:'/appointments', icon:CalendarDays,    route:'/appointments' },
      { label:'Staff',        path:'/staff',        icon:UserCog,         route:'/staff' },
      { label:'Patients',     path:'/patients',     icon:Users,           route:'/patients' },
      { label:'Inventory',    path:'/inventory',    icon:Package,         route:'/inventory' },
      { label:'Reports',      path:'/reports',      icon:BarChart3,       route:'/reports' },
    ]},
  ],
  clinic_admin: [
    { group: 'Operations', items: [
      { label:'Dashboard',    path:'/dashboard',    icon:LayoutDashboard, route:'/dashboard' },
      { label:'Appointments', path:'/appointments', icon:CalendarDays,    route:'/appointments' },
      { label:'Patients',     path:'/patients',     icon:Users,           route:'/patients' },
      { label:'Staff',        path:'/staff',        icon:UserCog,         route:'/staff' },
      { label:'Branches',     path:'/branches',     icon:Building2,       route:'/branches' },
    ]},
    { group: 'Finance & Ops', items: [
      { label:'Billing',      path:'/billing',      icon:FileText,        route:'/billing' },
      { label:'Finance',      path:'/finance',      icon:TrendingUp,      route:'/finance' },
      { label:'Inventory',    path:'/inventory',    icon:Package,         route:'/inventory' },
      { label:'Reports',      path:'/reports',      icon:BarChart3,       route:'/reports' },
    ]},
  ],
  platform_admin: [
    { group: 'Platform', items: [
      { label:'Dashboard',    path:'/dashboard',    icon:LayoutDashboard,  route:'/dashboard' },
      { label:'Clinics',      path:'/clinics',      icon:Building2,        route:'/clinics' },
      { label:'Approvals',    path:'/approvals',    icon:ShieldCheck,      route:'/approvals' },
      { label:'Subscriptions',path:'/subscriptions',icon:CreditCard,       route:'/subscriptions' },
      { label:'Users',        path:'/users',        icon:Users,            route:'/users' },
    ]},
  ],
  patient: [
    { group: 'My Health', items: [
      { label:'Dashboard',       path:'/dashboard',       icon:LayoutDashboard, route:'/dashboard' },
      { label:'Appointments',    path:'/appointments',    icon:CalendarDays,    route:'/appointments' },
      { label:'Medical Records', path:'/medical-records', icon:Activity,        route:'/medical-records' },
      { label:'Billing',         path:'/billing',         icon:FileText,        route:'/billing' },
    ]},
  ],
};

// Fallback for any role
const DEFAULT_NAV = [
  { group: 'Menu', items: [
    { label:'Dashboard', path:'/dashboard', icon:LayoutDashboard, route:'/dashboard' },
  ]},
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ open, onClose }) {
  const user          = useAuthStore(s => s.user);
  const allowedRoutes = useAuthStore(s => s.allowedRoutes);
  const clinicName    = useTenantStore(s => s.clinicName);
  const { logout }    = useAuth();
  const location      = useLocation();

  const role    = user?.role ?? 'receptionist';
  const groups  = NAV_MAPS[role] ?? DEFAULT_NAV;

  // Filter by allowed routes
  const filteredGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(item =>
      !allowedRoutes?.length || allowedRoutes.includes(item.route)
    ),
  })).filter(g => g.items.length > 0);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-[260px] z-30 flex flex-col',
          'transform transition-transform duration-300 ease-out-expo',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          background: 'linear-gradient(180deg, #0f2744 0%, #0a1628 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            {/* Brand mark */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)', boxShadow: '0 4px 16px rgba(37,99,235,0.5)' }}
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C9.24 2 7 4.24 7 7c0 1.77.89 3.34 2.24 4.3C5.68 12.58 3.5 15.5 3.5 19h17c0-3.5-2.18-6.42-5.74-7.7A5 5 0 0017 7c0-2.76-2.24-5-5-5z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight tracking-wide">
                DentFlow <span className="text-blue-400">Pro</span>
              </p>
              <p className="text-blue-300/60 text-xs leading-tight truncate max-w-[140px] mt-0.5">
                {clinicName ?? 'Loading…'}
              </p>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin space-y-5">
          {filteredGroups.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-2 text-2xs font-black tracking-[0.16em] uppercase"
                style={{ color: 'rgba(148,163,184,0.5)' }}
              >
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon      = item.icon;
                  const isActive  = location.pathname === item.path ||
                                    location.pathname.startsWith(item.path + '/');
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative"
                      style={{
                        background:  isActive ? 'rgba(37,99,235,0.18)' : 'transparent',
                        color:       isActive ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                        boxShadow:   isActive ? 'inset 0 0 0 1px rgba(37,99,235,0.25)' : 'none',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Active indicator line */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-blue-400" />
                      )}
                      <Icon size={16} className="flex-shrink-0"
                        style={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.4)' }}
                      />
                      <span style={{ color: isActive ? '#e0f2fe' : 'rgba(255,255,255,0.6)' }}>
                        {item.label}
                      </span>
                      {isActive && (
                        <ChevronRight size={14} className="ml-auto opacity-40" style={{ color: '#93c5fd' }} />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User footer ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-3 pb-4 pt-3 space-y-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Settings */}
          <NavLink
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <Settings size={16} className="flex-shrink-0" />
            Settings
          </NavLink>

          {/* User card */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl mt-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/80 truncate leading-tight">
                {user?.name ?? 'User'}
              </p>
              <p className="text-2xs text-white/40 capitalize leading-tight mt-0.5">
                {user?.role?.replace('_', ' ') ?? 'role'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
