import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Clock, MessageSquare, ChevronDown, ChevronUp, Loader2, Send, RefreshCw } from 'lucide-react';
import { getLabOrders, updateLabOrderStatus, addLabOrderNote } from '../../services/labService';
import { useToast } from '../../components/ui/Toast';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'in_progress',label: 'In Progress' },
  { key: 'ready',      label: 'Ready' },
  { key: 'delivered',  label: 'Delivered' },
];

const statusBadge = {
  pending:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  sent_to_lab: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  ready:       'bg-green-100 text-green-700 border-green-200',
  delivered:   'bg-gray-100 text-gray-600 border-gray-200',
  cancelled:   'bg-red-100 text-red-600 border-red-200',
};

const statusLabel = {
  pending:     'Pending',
  sent_to_lab: 'Sent to Lab',
  in_progress: 'In Progress',
  ready:       'Ready',
  delivered:   'Delivered',
  cancelled:   'Cancelled',
};

// Next status action config
const nextAction = {
  pending:    { label: 'Mark Received', next: 'sent_to_lab', color: 'bg-blue-600 hover:bg-blue-700' },
  sent_to_lab:{ label: 'Start Work',    next: 'in_progress', color: 'bg-purple-600 hover:bg-purple-700' },
  in_progress:{ label: 'Mark Ready',    next: 'ready',       color: 'bg-green-600 hover:bg-green-700' },
};

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onStatusUpdate, onNoteAdded }) {
  const { success, error: toastError } = useToast();
  const [expanded,    setExpanded]    = useState(false);
  const [noteText,    setNoteText]    = useState('');
  const [savingNote,  setSavingNote]  = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const action = nextAction[order.status];

  const handleStatusUpdate = async () => {
    if (!action) return;
    setUpdatingStatus(true);
    try {
      await onStatusUpdate(order.id, action.next);
      success(`Order marked as ${statusLabel[action.next]}`);
    } catch {
      toastError('Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await onNoteAdded(order.id, noteText.trim());
      setNoteText('');
      success('Note added.');
    } catch {
      toastError('Failed to add note.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[13px] font-black text-gray-900">{order.lab_order_number}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${statusBadge[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {statusLabel[order.status] ?? order.status}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold capitalize">
                {order.order_type?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-gray-800">{order.patient_name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Dr. {order.ordering_dentist}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {order.expected_ready_date && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                <Clock className="w-3 h-3" />
                <span>{new Date(order.expected_ready_date).toLocaleDateString()}</span>
              </div>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Material + tooth numbers quick row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {order.material && (
            <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
              Material: <strong>{order.material}</strong>
            </span>
          )}
          {order.tooth_numbers?.length > 0 && (
            <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
              Teeth: <strong>{order.tooth_numbers.join(', ')}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-gray-100 space-y-4">

              {/* Instructions */}
              {order.instructions && (
                <div className="pt-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em] mb-1.5">Instructions</p>
                  <p className="text-[12px] text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{order.instructions}</p>
                </div>
              )}

              {/* Fitting info */}
              {order.status === 'ready' && order.fitting_appointment_id && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200">
                  <Clock className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-green-700 font-semibold">Fitting appointment has been scheduled.</p>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em] mb-1.5">Notes</p>
                  <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed">{order.notes}</pre>
                </div>
              )}

              {/* Add note */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em] mb-1.5">Add Note</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Type a note…"
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-[12px] outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={savingNote || !noteText.trim()}
                    className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action footer */}
      {action && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
          <button
            onClick={handleStatusUpdate}
            disabled={updatingStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[12px] font-bold transition-colors disabled:opacity-60 ${action.color}`}
          >
            {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {action.label}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LabOrders() {
  const { error: toastError } = useToast();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [page, setPage] = useState(1);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (activeTab !== 'all') params.status = activeTab;
      const res = await getLabOrders(params);
      setOrders(res.data || []);
      setPagination({
        total:        res.meta?.total        || 0,
        current_page: res.meta?.current_page || 1,
        last_page:    res.meta?.last_page    || 1,
      });
    } catch {
      toastError('Failed to load lab orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [activeTab, page]);

  const handleStatusUpdate = async (id, newStatus) => {
    await updateLabOrderStatus(id, newStatus);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const handleNoteAdded = async (id, note) => {
    await addLabOrderNote(id, note);
    // Reload to get updated notes
    loadOrders();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.14em]">Lab Technician</p>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Lab Orders</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{pagination.total} total orders</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <FlaskConical className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-500">No lab orders found</p>
          <p className="text-[12px] text-gray-400 mt-1">Try a different filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusUpdate={handleStatusUpdate}
              onNoteAdded={handleNoteAdded}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
          >
            Previous
          </button>
          <span className="text-[12px] text-gray-500">
            Page {pagination.current_page} of {pagination.last_page}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
            disabled={page === pagination.last_page}
            className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
