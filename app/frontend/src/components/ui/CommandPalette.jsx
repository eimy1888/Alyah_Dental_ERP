import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, User, Calendar, FileText, Package, Users } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';

const ROLE_ROUTES = {
  clinic_admin:   '/admin',
  branch_manager: '/manager',
  receptionist:   '/receptionist',
  dentist:        '/dentist',
  accountant:     '/accountant',
  lab_technician: '/lab',
  patient:        '/patient',
  platform_admin: '/platform',
};

function ResultIcon({ type }) {
  const cls = 'w-4 h-4';
  if (type === 'patient')     return <User className={cls} />;
  if (type === 'appointment') return <Calendar className={cls} />;
  if (type === 'invoice')     return <FileText className={cls} />;
  if (type === 'staff')       return <Users className={cls} />;
  return <Package className={cls} />;
}

export function CommandPalette({ open, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const base     = ROLE_ROUTES[user?.role] ?? '';

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const role = user?.role;
        let endpoint = '';

        if (['receptionist','branch_manager','clinic_admin'].includes(role)) {
          endpoint = `/${role === 'clinic_admin' ? 'admin' : role}/patients?search=${encodeURIComponent(query)}&per_page=5`;
        } else if (role === 'dentist') {
          endpoint = `/dentist/patients?search=${encodeURIComponent(query)}&per_page=5`;
        } else if (role === 'accountant') {
          endpoint = `/accountant/invoices/all?search=${encodeURIComponent(query)}&per_page=5`;
        } else if (role === 'platform_admin') {
          endpoint = `/platform/clinics?search=${encodeURIComponent(query)}`;
        }

        if (!endpoint) { setLoading(false); return; }

        const { data } = await apiClient.get(endpoint);
        const items = data?.data?.data ?? data?.data ?? [];

        setResults(items.slice(0, 8).map((item, i) => ({
          id:    item.id ?? i,
          label: item.full_name ?? item.name ?? item.invoice_number ?? item.patient_name ?? String(item.id),
          sub:   item.phone ?? item.email ?? item.status ?? '',
          type:  role === 'accountant' ? 'invoice' : 'patient',
          href:  role === 'accountant' ? `${base}/billing` : `${base}/patients`,
        })));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.role]);

  // Keyboard navigation
  const handleKey = useCallback((e) => {
    if (!open) return;
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected].href);
      onClose();
    }
  }, [open, results, selected, navigate, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search patients, invoices, appointments..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => { navigate(r.href); onClose(); }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-400">
                    <ResultIcon type={r.type} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No results for "<span className="font-medium text-gray-600 dark:text-gray-300">{query}</span>"
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Searching...</div>
        )}

        {/* Hint */}
        {!query && (
          <div className="px-4 py-4 text-xs text-gray-400 flex gap-4">
            <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Enter</kbd> open</span>
            <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
