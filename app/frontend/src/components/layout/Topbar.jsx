// src/components/layout/Topbar.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, LogOut, Bell, Search, ChevronDown, Settings, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';

// Ethiopian Traditional Time display helper
function getETTTime() {
  const now   = new Date();
  let h       = now.getHours();
  const m     = now.getMinutes().toString().padStart(2, '0');
  const ettH  = ((h - 6 + 24) % 24);
  const disp  = ettH % 12 === 0 ? 12 : ettH % 12;
  const period = h >= 6 && h < 12 ? 'ጥዋት' : h >= 12 && h < 18 ? 'ቀን' : h >= 18 ? 'ምሽት' : 'ሌሊት';
  return `${disp}:${m} ${period}`;
}

function useETTClock() {
  const [time, setTime] = useState(getETTTime());
  useEffect(() => {
    const t = setInterval(() => setTime(getETTTime()), 30000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ── Notification Dropdown ─────────────────────────────────────────────────────
function NotificationDropdown({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-60"
      style={{
        background: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <div>
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          <p className="text-xs text-gray-400 mt-0.5">3 unread</p>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
        >
          <X size={14} />
        </button>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto scrollbar-thin">
        {[
          { title: 'New appointment booked', sub: 'Mikiyas Haile — 2:30 ጥዋት', dot: 'bg-blue-500', time: '2m ago' },
          { title: 'Invoice ready for review', sub: 'INV-2026-0142 — ETB 13,800', dot: 'bg-amber-500', time: '18m ago' },
          { title: 'Patient checked in', sub: 'Sara Tekle — Dr. Michael Chen', dot: 'bg-green-500', time: '32m ago' },
        ].map((n, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition cursor-pointer">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${n.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{n.sub}</p>
            </div>
            <span className="text-2xs text-gray-300 flex-shrink-0 mt-1">{n.time}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid #f1f5f9' }}>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
          View all notifications
        </button>
      </div>
    </motion.div>
  );
}

// ── User Dropdown ─────────────────────────────────────────────────────────────
function UserDropdown({ user, onLogout, onClose }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden z-60"
      style={{
        background: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      {/* User info */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
        <p className="text-xs text-gray-400 capitalize truncate mt-0.5">
          {user?.role?.replace('_', ' ')}
        </p>
      </div>

      {/* Actions */}
      <div className="py-1.5">
        {[
          { icon: User,     label: 'Profile',  action: () => { navigate('/settings'); onClose(); } },
          { icon: Settings, label: 'Settings', action: () => { navigate('/settings'); onClose(); } },
        ].map(item => (
          <button key={item.label}
            onClick={item.action}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <item.icon size={15} className="text-gray-400" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="py-1.5" style={{ borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar({ onMenuClick }) {
  const user           = useAuthStore(s => s.user);
  const { logout }     = useAuth();
  const ettTime        = useETTClock();
  const [notifOpen, setNotifOpen]   = useState(false);
  const [userOpen,  setUserOpen]    = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef  = useRef(null);
  const userRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const today = new Date().toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  return (
    <header className="h-[60px] flex items-center justify-between px-4 lg:px-6 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Left ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Hamburger */}
        <button onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
        >
          <Menu size={18} />
        </button>

        {/* Date + ETT time */}
        <div className="hidden sm:flex items-center gap-3">
          <div>
            <p className="text-xs font-medium text-gray-700 leading-tight">{today}</p>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              {ettTime} <span className="text-gray-300">·</span> Ethiopian time
            </p>
          </div>
        </div>
      </div>

      {/* ── Right ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Search trigger */}
        <button onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 h-8 px-3.5 rounded-full text-xs text-gray-400 transition hover:bg-gray-100"
          style={{ border: '1px solid #e5e7eb' }}
        >
          <Search size={13} />
          <span>Search…</span>
          <kbd className="ml-1 text-2xs px-1.5 py-0.5 rounded-md font-mono"
            style={{ background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb' }}
          >⌘K</kbd>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
          >
            <Bell size={17} />
            {/* Unread dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          </button>
          <AnimatePresence>
            {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* User button */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full hover:bg-gray-100 transition"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}
            >
              {initials}
            </div>
            {/* Name + role */}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name?.split(' ')[0]}</p>
              <p className="text-2xs text-gray-400 capitalize leading-tight">{user?.role?.replace('_',' ')}</p>
            </div>
            <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {userOpen && <UserDropdown user={user} onLogout={logout} onClose={() => setUserOpen(false)} />}
          </AnimatePresence>
        </div>

      </div>

      {/* ── Search overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-80 flex items-start justify-center pt-20 px-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <Search size={18} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search patients, appointments, invoices…"
                  className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                />
                <button onClick={() => setSearchOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition font-mono px-2 py-1 rounded-lg"
                  style={{ background: '#f3f4f6' }}
                >ESC</button>
              </div>
              <div className="px-5 pb-4 text-xs text-gray-400 text-center"
                style={{ borderTop: '1px solid #f1f5f9' }}
              >
                Type to search across all records
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
