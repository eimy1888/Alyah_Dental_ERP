import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Receipt, FileText,
  Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Wallet, Heart
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getClinicInfo } from '../../services/accountantService';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/accountant/dashboard', icon: LayoutDashboard },
  { label: 'Revenue',   to: '/accountant/revenue',   icon: TrendingUp },
  { label: 'Expenses',  to: '/accountant/expenses',  icon: Wallet },
  { label: 'Billing',   to: '/accountant/billing',   icon: Receipt },
  { label: 'Reports',   to: '/accountant/reports',   icon: FileText },
  { label: 'Settings',  to: '/accountant/settings',  icon: Settings },
];

export default function AccountantLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed]           = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clinicInfo, setClinicInfo]         = useState(null);

  useEffect(() => {
    getClinicInfo()
      .then(setClinicInfo)
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
                  Finance
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
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Clinic info strip */}
        {!collapsed && clinicInfo?.clinic && (
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-xs font-semibold text-white">
              {clinicInfo.clinic.name}
            </p>
            <p className="truncate text-[10px] text-blue-300">
              {clinicInfo.clinic.city ?? 'Addis Ababa'}
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
                ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}
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

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {clinicInfo?.clinic?.name ?? 'Loading...'}
              </p>
              <p className="text-xs text-gray-400">Finance Department · Accountant</p>
            </div>

            {/* User avatar only — no notifications */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full
                bg-blue-100 text-sm font-bold text-blue-700">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{user?.name ?? 'Accountant'}</p>
                <p className="text-xs text-gray-400">Accountant</p>
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