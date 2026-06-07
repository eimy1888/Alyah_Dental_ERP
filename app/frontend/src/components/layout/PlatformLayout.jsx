import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart, LayoutDashboard, Building2, ShieldCheck,
  CreditCard, Users, Settings, ChevronLeft, ChevronRight,
  LogOut, Bell, Stethoscope,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useApprovalsStore from '../../store/approvalsStore';

const navItems = [
  { label: 'Dashboard',     to: '/platform/dashboard',     icon: LayoutDashboard },
  { label: 'Clinics',       to: '/platform/clinics',       icon: Building2 },
  { label: 'Approvals',     to: '/platform/approvals',     icon: ShieldCheck, badge: true },
  { label: 'Subscriptions', to: '/platform/subscriptions', icon: CreditCard },
  { label: 'Users',         to: '/platform/users',         icon: Users },
  { label: 'Settings',      to: '/platform/settings',      icon: Settings },
];

function SidebarContent({ collapsed, location, pendingCount, user, onLinkClick, onLogout }) {
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'PA';

  return (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-[18px] border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#051525] flex items-center justify-center shrink-0 shadow-lg border border-white/10">
          <img src="/brand/alyah-logo-icon.svg" alt="Alyah" className="w-7 h-7 object-contain" />
        </div>
        {!collapsed && (
          <img src="/brand/alyah-logo-white.svg" alt="Alyah Dental ERP" className="h-8 w-auto object-contain object-left" />
        )}
      </div>

      {/* User block */}
      {!collapsed && user && (
        <div className="mx-3 mt-4 mb-2 rounded-xl bg-white/[0.07] border border-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-white leading-none truncate">{user.name ?? 'Platform Admin'}</p>
              <p className="text-[10px] text-white/40 mt-0.5 truncate">{user.email ?? ''}</p>
            </div>
          </div>
        </div>
      )}

      {!collapsed && <p className="px-5 pt-4 pb-1.5 text-[9px] font-black tracking-[0.18em] text-white/25 uppercase">Menu</p>}

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon, badge }) => {
          const isActive  = location.pathname === to;
          const showBadge = badge && pendingCount > 0;
          return (
            <Link key={to} to={to} onClick={onLinkClick}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150
                ${isActive ? 'bg-white/[0.14] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.08]'}
                ${collapsed ? 'justify-center' : ''}
              `}>
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-white/70" />}
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
              {showBadge && (
                <span className={`flex items-center justify-center rounded-full bg-red-500 text-white font-black leading-none
                  ${collapsed ? 'absolute -top-1 -right-1 w-4 h-4 text-[9px]' : 'ml-auto min-w-[20px] h-5 px-1.5 text-[10px]'}`}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-white/10">
        <button onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default function PlatformLayout() {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();
  const { pendingCount } = useApprovalsStore();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'PA';

  const sidebarProps = { collapsed, location, pendingCount, user, onLinkClick: () => setMobileOpen(false), onLogout: handleLogout };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex">

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-[#0D1B2A] shrink-0 transition-all duration-300 relative ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
        <SidebarContent {...sidebarProps} />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center z-10 hover:bg-gray-50 transition-colors">
          {collapsed ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
        </button>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[240px] bg-[#0D1B2A] flex flex-col z-10">
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-20"
          style={{ boxShadow: '0 1px 0 #e2e8f0' }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="text-gray-400 hidden sm:inline">Alyah Dental ERP</span>
              <span className="text-gray-300 hidden sm:inline">/</span>
              <span className="font-semibold text-gray-700">Platform Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pending approvals bell */}
            <Link to="/platform/approvals"
              className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              title={pendingCount > 0 ? `${pendingCount} pending approvals` : 'No pending approvals'}>
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-white">{initials}</span>
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-[12px] font-bold text-gray-800">{user?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Platform Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
