/**
 * Global Toast notification system for DentFlow Pro.
 *
 * Usage:
 *   1. Wrap your app in <ToastProvider>
 *   2. Call useToast() anywhere to get { toast, success, error, warning, info }
 *
 * Example:
 *   const { success, error } = useToast();
 *   success('Patient checked in successfully.');
 *   error('Failed to load appointments.');
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Context ───────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

const ICONS = {
  success: { Icon: CheckCircle2, cls: 'text-green-500' },
  error:   { Icon: XCircle,      cls: 'text-red-500' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-500' },
  info:    { Icon: Info,          cls: 'text-blue-500' },
};

const BORDER = {
  success: 'border-l-green-500',
  error:   'border-l-red-500',
  warning: 'border-l-amber-500',
  info:    'border-l-blue-500',
};

let _id = 0;

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // max 5 visible
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback((msg, dur)  => toast(msg, 'success', dur), [toast]);
  const error   = useCallback((msg, dur)  => toast(msg, 'error',   dur ?? 6000), [toast]);
  const warning = useCallback((msg, dur)  => toast(msg, 'warning', dur), [toast]);
  const info    = useCallback((msg, dur)  => toast(msg, 'info',    dur), [toast]);

  return (
    <ToastCtx.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}

      {/* Render toasts */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        style={{ width: 'min(360px, calc(100vw - 2rem))' }}
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const { Icon, cls } = ICONS[t.type] || ICONS.info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className={`
                  pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3.5
                  bg-white border border-gray-100 border-l-4 ${BORDER[t.type]}
                  shadow-xl
                `}
                role="alert"
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cls}`} />
                <p className="flex-1 text-[13px] font-semibold text-gray-800 leading-snug">
                  {t.message}
                </p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors ml-1 mt-0.5"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
