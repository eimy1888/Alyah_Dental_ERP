/**
 * DashCard — Complete enterprise UI component library for DentFlow Pro.
 *
 * Exports:
 *   StatCardGradient   — colored gradient KPI card
 *   StatCardLight      — white KPI card
 *   SectionCard        — white content container with header
 *   PageHeader         — page title + eyebrow + actions
 *   StatusBadge        — pill badge for all status values (v1 + v2)
 *   Skeleton           — inline shimmer bar
 *   SkeletonCard       — full KPI card skeleton
 *   SkeletonTable      — table rows skeleton
 *   DataTable          — table with sticky header + empty state
 *   EmptyState         — illustrated empty state
 *   RefreshBtn         — spinning refresh button
 *   ConfirmDialog      — accessible confirmation modal
 *   AnimatedCounter    — number counter animation
 *   PageWrapper        — fade-in-up page entry animation
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

// ── Card gradients ────────────────────────────────────────────────────────────
export const CARD_GRADIENTS = {
  blue:   { bg: 'from-[#2563eb] to-[#06b6d4]', icon: 'bg-white/20' },
  teal:   { bg: 'from-[#0d9488] to-[#06b6d4]', icon: 'bg-white/20' },
  violet: { bg: 'from-[#7c3aed] to-[#a78bfa]', icon: 'bg-white/20' },
  amber:  { bg: 'from-[#d97706] to-[#f59e0b]', icon: 'bg-white/20' },
  green:  { bg: 'from-[#059669] to-[#34d399]', icon: 'bg-white/20' },
  rose:   { bg: 'from-[#e11d48] to-[#fb7185]', icon: 'bg-white/20' },
  sky:    { bg: 'from-[#0284c7] to-[#38bdf8]', icon: 'bg-white/20' },
  indigo: { bg: 'from-[#4338ca] to-[#818cf8]', icon: 'bg-white/20' },
  gray:   { bg: 'from-[#475569] to-[#64748b]', icon: 'bg-white/20' },
};

// ── AnimatedCounter ───────────────────────────────────────────────────────────
export function AnimatedCounter({ value, duration = 800, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const start  = useRef(0);
  const raf    = useRef(null);
  const target = typeof value === 'number' ? value : parseInt(value) || 0;

  useEffect(() => {
    start.current = 0;
    const begin = performance.now();

    const tick = (now) => {
      const elapsed  = now - begin;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-expo
      const eased    = 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ── PageWrapper ───────────────────────────────────────────────────────────────
export function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StatCardGradient ──────────────────────────────────────────────────────────
export function StatCardGradient({ label, value, sub, icon: Icon, gradient = 'blue', extra, animate = true }) {
  const g = CARD_GRADIENTS[gradient] || CARD_GRADIENTS.blue;
  const isNum = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-gradient-to-br ${g.bg} rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-default`}
    >
      {/* decorative orb */}
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10 bg-white -translate-y-7 translate-x-7 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/70 leading-tight">{label}</p>
          {Icon && (
            <div className={`w-9 h-9 rounded-xl ${g.icon} flex items-center justify-center shrink-0`}>
              <Icon style={{ width: 18, height: 18 }} className="text-white" />
            </div>
          )}
        </div>
        <p className="text-[32px] font-black text-white leading-none mb-1">
          {animate && isNum ? <AnimatedCounter value={value} /> : value}
        </p>
        {sub && <p className="text-[11px] text-white/65 mt-1">{sub}</p>}
        {extra && <div className="mt-3">{extra}</div>}
      </div>
    </motion.div>
  );
}

// ── StatCardLight ─────────────────────────────────────────────────────────────
export function StatCardLight({ label, value, sub, icon: Icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600', link, onClick, accentColor = 'bg-blue-500', animate = true }) {
  const isNum = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between shadow-sm relative overflow-hidden"
    >
      {/* left accent bar */}
      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${accentColor}`} />
      <div className="pl-2">
        <p className="text-[12px] text-gray-500 mb-1.5 font-medium">{label}</p>
        <p className="text-[28px] font-black text-gray-900 leading-none">
          {animate && isNum ? <AnimatedCounter value={value} /> : value}
        </p>
        {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
      </div>
    </motion.div>
  );

  if (link)    return <a href={link} className="block">{content}</a>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{content}</button>;
  return content;
}

// ── SectionCard ───────────────────────────────────────────────────────────────
export function SectionCard({ title, subtitle, action, children, className = '', noPad = false }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            {title    && <h2 className="text-[14px] font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 ml-3">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start justify-between mb-7"
    >
      <div>
        {eyebrow && (
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-blue-600 mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-black text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-1">{actions}</div>
      )}
    </motion.div>
  );
}

// ── StatusBadge — covers v1 + v2 billing states ───────────────────────────────
export function StatusBadge({ status, label }) {
  const MAP = {
    // Appointment statuses
    pending:           'bg-amber-50   text-amber-700   border-amber-200',
    confirmed:         'bg-blue-50    text-blue-700    border-blue-200',
    checked_in:        'bg-teal-50    text-teal-700    border-teal-200',
    in_progress:       'bg-purple-50  text-purple-700  border-purple-200',
    treatment_started: 'bg-violet-50  text-violet-700  border-violet-200',
    completed:         'bg-green-50   text-green-700   border-green-200',
    no_show:           'bg-red-50     text-red-700     border-red-200',
    cancelled:         'bg-gray-100   text-gray-500    border-gray-200',
    // Patient statuses
    active:            'bg-green-50   text-green-700   border-green-200',
    inactive:          'bg-gray-100   text-gray-500    border-gray-200',
    archived:          'bg-gray-100   text-gray-400    border-gray-200',
    // Invoice v1 statuses
    paid:              'bg-green-50   text-green-700   border-green-200',
    partial:           'bg-amber-50   text-amber-700   border-amber-200',
    overdue:           'bg-red-50     text-red-700     border-red-200',
    sent:              'bg-blue-50    text-blue-700    border-blue-200',
    draft:             'bg-gray-100   text-gray-500    border-gray-200',
    // Invoice v2 lifecycle statuses
    estimated:         'bg-sky-50     text-sky-700     border-sky-200',
    updated:           'bg-orange-50  text-orange-700  border-orange-200',
    final:             'bg-indigo-50  text-indigo-700  border-indigo-200',
    under_review:      'bg-yellow-50  text-yellow-700  border-yellow-300',
    locked:            'bg-slate-100  text-slate-600   border-slate-300',
    cancelled_invoice: 'bg-gray-100   text-gray-400    border-gray-200',
    // Episode statuses
    open:              'bg-blue-50    text-blue-700    border-blue-200',
    pending_lab:       'bg-amber-50   text-amber-700   border-amber-200',
    pending_review:    'bg-yellow-50  text-yellow-700  border-yellow-300',
    finalized:         'bg-indigo-50  text-indigo-700  border-indigo-200',
    billed:            'bg-green-50   text-green-700   border-green-200',
    // Inventory
    healthy:           'bg-green-50   text-green-700   border-green-200',
    low:               'bg-amber-50   text-amber-700   border-amber-200',
    out_of_stock:      'bg-red-50     text-red-700     border-red-200',
    watch:             'bg-orange-50  text-orange-700  border-orange-200',
    // Priority / severity
    high:              'bg-red-50     text-red-700     border-red-200',
    medium:            'bg-amber-50   text-amber-700   border-amber-200',
    low_priority:      'bg-green-50   text-green-700   border-green-200',
    emergency:         'bg-red-600    text-white       border-red-600',
    // Insurance
    submitted:         'bg-blue-50    text-blue-700    border-blue-200',
    approved:          'bg-green-50   text-green-700   border-green-200',
    rejected:          'bg-red-50     text-red-700     border-red-200',
  };

  const cls = MAP[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const display = label ?? (status ?? '—').replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls} capitalize`}>
      {display}
    </span>
  );
}

// ── Skeleton (inline shimmer bar) ─────────────────────────────────────────────
export function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s linear infinite',
      }}
    />
  );
}

// ── SkeletonCard (full gradient KPI card placeholder) ─────────────────────────
export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 bg-gray-100 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-3 w-24 bg-gray-200 rounded-full" />
        <div className="w-9 h-9 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded-lg mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded-full" />
    </div>
  );
}

// ── SkeletonTable (table rows placeholder) ────────────────────────────────────
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/70">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-3">
                <div className="h-3 w-16 bg-gray-200 rounded-full animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-gray-50">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-4">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${60 + Math.random() * 30}%`,
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: `shimmer 2s linear infinite`,
                      animationDelay: `${r * 0.08}s`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── EmptyState (illustrated empty state) ─────────────────────────────────────
const EMPTY_ICONS = {
  appointments: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <rect x="10" y="14" width="60" height="52" rx="8" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
      <rect x="10" y="26" width="60" height="2" fill="#BFDBFE"/>
      <rect x="22" y="10" width="4" height="10" rx="2" fill="#93C5FD"/>
      <rect x="54" y="10" width="4" height="10" rx="2" fill="#93C5FD"/>
      <rect x="22" y="36" width="8" height="8" rx="2" fill="#DBEAFE"/>
      <rect x="36" y="36" width="8" height="8" rx="2" fill="#DBEAFE"/>
      <rect x="50" y="36" width="8" height="8" rx="2" fill="#DBEAFE"/>
      <rect x="22" y="50" width="8" height="8" rx="2" fill="#DBEAFE"/>
      <rect x="36" y="50" width="8" height="8" rx="2" fill="#EFF6FF"/>
    </svg>
  ),
  patients: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <circle cx="40" cy="28" r="14" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
      <path d="M14 66c0-14.36 11.64-26 26-26s26 11.64 26 26" stroke="#BFDBFE" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="40" cy="28" r="8" fill="#DBEAFE"/>
    </svg>
  ),
  invoices: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <rect x="14" y="10" width="52" height="60" rx="6" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="2"/>
      <rect x="22" y="24" width="36" height="3" rx="1.5" fill="#BBF7D0"/>
      <rect x="22" y="32" width="28" height="3" rx="1.5" fill="#D1FAE5"/>
      <rect x="22" y="40" width="32" height="3" rx="1.5" fill="#D1FAE5"/>
      <rect x="22" y="52" width="36" height="6" rx="3" fill="#6EE7B7"/>
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <rect x="8" y="20" width="64" height="14" rx="7" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
      <rect x="8" y="40" width="64" height="14" rx="7" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
      <circle cx="20" cy="27" r="5" fill="#93C5FD"/>
      <rect x="30" y="24" width="20" height="3" rx="1.5" fill="#BFDBFE"/>
      <circle cx="20" cy="47" r="5" fill="#A5B4FC"/>
      <rect x="30" y="44" width="24" height="3" rx="1.5" fill="#C7D2FE"/>
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <path d="M40 12c-14 0-22 10-22 22v10l-6 8h56l-6-8V34c0-12-8-22-22-22z" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
      <rect x="34" y="62" width="12" height="6" rx="3" fill="#93C5FD"/>
      <circle cx="56" cy="22" r="7" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="2"/>
      <path d="M56 18v5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="56" cy="25" r="1" fill="#F59E0B"/>
    </svg>
  ),
  default: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <circle cx="40" cy="40" r="28" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2"/>
      <path d="M28 40h24M40 28v24" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

export function EmptyState({ type = 'default', title, description, action }) {
  const icon = EMPTY_ICONS[type] || EMPTY_ICONS.default;
  const defaults = {
    appointments:  { title: 'No appointments',   description: 'No appointments scheduled yet. Book a new one to get started.' },
    patients:      { title: 'No patients',        description: 'No patient records found. Register a new patient to begin.' },
    invoices:      { title: 'No invoices',        description: 'No invoices created yet. Invoices appear here after check-in.' },
    queue:         { title: 'Queue is empty',     description: 'No patients in queue right now. Patients appear here after check-in.' },
    notifications: { title: 'All caught up',      description: 'No new notifications. You\'re up to date.' },
    default:       { title: 'Nothing here yet',   description: 'No data available for this view.' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-14 px-6 text-center"
    >
      <div className="mb-5 opacity-80">{icon}</div>
      <h3 className="text-[15px] font-bold text-gray-700 mb-2">
        {title ?? defaults[type]?.title}
      </h3>
      <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">
        {description ?? defaults[type]?.description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ headers, children, empty, emptyType = 'default', loading = false, loadingRows = 4 }) {
  if (loading) {
    return <SkeletonTable rows={loadingRows} cols={headers.length} />;
  }

  const hasChildren = children &&
    (Array.isArray(children) ? children.length > 0 : true) &&
    !(Array.isArray(children) && children.every(c => !c));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/70">
            {headers.map(h => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-black tracking-[0.14em] text-gray-400 uppercase whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {hasChildren ? children : (
            <tr>
              <td colSpan={headers.length} className="p-0">
                <EmptyState type={emptyType} title={empty} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',   // 'danger' | 'warning' | 'info'
  loading = false,
  onConfirm,
  onCancel,
}) {
  // Trap focus in modal when open
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  const btnCls = {
    danger:  'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info:    'bg-blue-600 hover:bg-blue-700 text-white',
  }[variant];

  const iconCls = {
    danger:  'bg-red-50   text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    info:    'bg-blue-50  text-blue-600',
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-80 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={onCancel}
        >
          <motion.div
            key="confirm-panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-2xl ${iconCls} flex items-center justify-center mb-4`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-black text-gray-900 mb-2">{title}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-6">{description}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${btnCls} disabled:opacity-60`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Processing…
                  </span>
                ) : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── RefreshBtn ────────────────────────────────────────────────────────────────
export function RefreshBtn({ onClick, spinning }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={spinning}
      whileTap={{ rotate: 360, transition: { duration: 0.5 } }}
      className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
      title="Refresh"
    >
      <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </motion.button>
  );
}
