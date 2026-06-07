// src/components/layout/ManagerSidebar.jsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Receipt,
  TrendingUp,
  Package,
  BarChart2,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/manager/dashboard",    label: "Dashboard",       Icon: LayoutDashboard },
  { to: "/manager/appointments", label: "Appointments",    Icon: Calendar },
  { to: "/manager/patients",     label: "Patients",        Icon: Users },
  { to: "/manager/billing",      label: "Billing",         Icon: Receipt },
  { to: "/manager/finance",      label: "Finance",         Icon: TrendingUp },
  { to: "/manager/inventory",    label: "Inventory",       Icon: Package },
  { to: "/manager/reports",      label: "Branch Reports",  Icon: BarChart2 },
  { to: "/manager/settings",     label: "Settings",        Icon: Settings },
];

export default function ManagerSidebar({ open }) {
  return (
    <aside
      style={{ width: open ? 224 : 56 }}
      className="flex flex-col bg-[#1a3f5c] text-white shrink-0 transition-all duration-200 overflow-hidden"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        {/* Logo circle */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>
        {open && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">DentFlow Pro</p>
            <p className="text-xs text-blue-300 truncate">Branch Manager</p>
          </div>
        )}
      </div>

      {/* MAIN MENU label */}
      {open && (
        <p className="px-4 pt-5 pb-2 text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
          Main Menu
        </p>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5
               ${isActive
                 ? "bg-white/15 text-white font-semibold"
                 : "text-blue-200 hover:bg-white/10 hover:text-white"
               }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {open && (
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <p className="text-xs text-blue-400">DentFlow Pro v2.0</p>
        </div>
      )}
    </aside>
  );
}