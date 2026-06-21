import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Circle } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';

const ROLE_PREFIX = {
  clinic_admin:   'admin',
  branch_manager: 'manager',
  receptionist:   'receptionist',
  dentist:        'dentist',
  accountant:     'accountant',
  lab_technician: 'lab',
  patient:        'patient',
};

export function NotificationCenter() {
  const user         = useAuthStore(s => s.user);
  const [open, setOpen]   = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const prefix = ROLE_PREFIX[user?.role] ?? '';

  // Load count every 30s
  useEffect(() => {
    if (!prefix) return;
    const load = async () => {
      try {
        const { data } = await apiClient.get(`/${prefix}/notifications/count`);
        setCount(data?.count ?? 0);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [prefix]);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open || !prefix) return;
    setLoading(true);
    apiClient.get(`/${prefix}/notifications`)
      .then(({ data }) => setItems(data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, prefix]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await apiClient.put(`/${prefix}/notifications/read-all`);
      setCount(0);
      setItems(items.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch { /* ignore */ }
  };

  const markRead = async (id) => {
    try {
      await apiClient.put(`/${prefix}/notifications/${id}/read`);
      setItems(items.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications {count > 0 && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{count}</span>}
            </h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button onClick={markAllRead} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Mark all read">
                  <CheckCheck className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    !n.read_at ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => !n.read_at && markRead(n.id)}
                >
                  <div className="mt-0.5 shrink-0">
                    {!n.read_at
                      ? <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                      : <div className="w-2 h-2" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                      {n.data?.title ?? n.title ?? 'Notification'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {n.data?.message ?? n.message ?? ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
