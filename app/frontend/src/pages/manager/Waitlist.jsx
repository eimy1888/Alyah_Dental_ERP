import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Loader2, RefreshCw, Clock,
  AlertTriangle, Phone, ChevronDown, ChevronUp,
  Users, Activity, Trash2,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import WaitlistRegistrationModal from '../../components/waitlist/WaitlistRegistrationModal';
import { convertWaitlistToAppointment, getQueue, removeFromQueue } from '../../services/managerService';

const PRIORITY_BADGE = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  normal: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const STATUS_BADGE = {
  waiting:    'bg-amber-100 text-amber-700 border border-amber-200',
  called:     'bg-blue-100 text-blue-700 border border-blue-200',
  in_service: 'bg-purple-100 text-purple-700 border border-purple-200',
  done:       'bg-green-100 text-green-700 border border-green-200',
  left:       'bg-gray-100 text-gray-500 border border-gray-200',
  removed:    'bg-gray-100 text-gray-400 border border-gray-100',
};

const STATUS_LABEL = {
  waiting:    'Waiting',
  called:     'Called',
  in_service: 'In Service',
  done:       'Done',
  left:       'Left',
  removed:    'Removed',
};

const QUEUE_PRIORITY_COLORS = {
  emergency:    'bg-red-500 text-white',
  scheduled:    'bg-blue-500 text-white',
  walk_in:      'bg-green-500 text-white',
  late_arrival: 'bg-amber-500 text-white',
};

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${
      type === 'error' ? 'bg-red-600' : 'bg-gray-900'
    }`}>
      <span>{type === 'error' ? '❌' : '✅'}</span>
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}

function ConvertToEmergencyModal({ entry, dentists, onClose, onConfirm, converting }) {
  const [dentistId, setDentistId] = useState('');
  const [reason,    setReason]    = useState('');
  const [error,     setError]     = useState('');

  const cases    = entry.medical_cases ?? [];
  const lastCase = cases.length > 0 ? cases[cases.length - 1].case : null;

  const handleConfirm = () => {
    if (!dentistId) { setError('Please select a dentist.'); return; }
    setError('');
    onConfirm({ dentist_id: Number(dentistId), reason: reason || lastCase || 'Emergency conversion' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-gray-900">Convert to Emergency</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm font-semibold text-red-800">{entry.name}</p>
            {entry.phone && <p className="text-xs text-red-500 mt-0.5">{entry.phone}</p>}
            {lastCase && <p className="text-xs text-red-500 mt-1">{lastCase}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assign Dentist</label>
            <select value={dentistId} onChange={(e) => setDentistId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-400 bg-white">
              <option value="">Select dentist...</option>
              {dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Override Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              rows={2} placeholder="Reason for emergency override..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-400 resize-none" />
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-700">
              ⚠️ This will create an immediate checked-in appointment and insert the patient at position #1 in the live queue.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={converting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40">
            {converting ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : 'Convert to Emergency'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WaitlistCard({ entry, index, dentists, onStatusChange, onRemove, onEdit, onConvert }) {
  const [expanded, setExpanded] = useState(false);
  const isUrgent = entry.priority === 'urgent';
  const cases    = entry.medical_cases ?? [];
  const hasCases = cases.length > 0;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      isUrgent ? 'border-red-300' : 'border-gray-100'
    }`}>
      <div className={`flex items-start gap-4 p-4 ${isUrgent ? 'bg-red-50/40' : ''}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
          isUrgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
        }`}>
          #{index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{entry.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[entry.priority]}`}>
              {entry.priority}
            </span>
            {entry.age && <span className="text-[10px] text-gray-400">{entry.age} yrs</span>}
            {entry.gender && <span className="text-[10px] text-gray-400 capitalize">{entry.gender}</span>}
          </div>
          {entry.phone && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
              <Phone className="w-3 h-3" /> {entry.phone}
            </p>
          )}
          {hasCases && (
            <p className="text-xs text-gray-600 leading-relaxed mb-1">
              <span className="font-semibold text-gray-500">Current: </span>
              {cases[cases.length - 1].case}
            </p>
          )}
          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" /> {entry.arrived_time || entry.arrived_at}
          </p>
          {cases.length > 1 && (
            <button onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-semibold">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Show'} {cases.length - 1} previous case{cases.length > 2 ? 's' : ''}
            </button>
          )}
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {[...cases].reverse().slice(1).map((mc, idx) => (
                <div key={idx} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-600">{mc.case}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(mc.added_at).toLocaleDateString()} · {mc.source}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[entry.status]}`}>
            {STATUS_LABEL[entry.status]}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {(entry.status === 'waiting' || entry.status === 'called') && (
              <button onClick={() => onConvert(entry)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors">
                <AlertTriangle className="w-3 h-3" /> Emergency
              </button>
            )}
            {entry.status === 'waiting' && (
              <button onClick={() => onStatusChange(entry, 'called')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors">
                Call
              </button>
            )}
            {entry.status === 'called' && (
              <button onClick={() => onStatusChange(entry, 'in_service')}
                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[10px] font-bold hover:bg-purple-700 transition-colors">
                Start
              </button>
            )}
            {entry.status === 'in_service' && (
              <button onClick={() => onStatusChange(entry, 'done')}
                className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-bold hover:bg-green-600 transition-colors">
                Done
              </button>
            )}
            <button onClick={() => onEdit(entry)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-50 transition-colors">
              Edit
            </button>
            <button onClick={() => onRemove(entry)}
              className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 text-[10px] font-bold hover:bg-red-50 transition-colors">
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ entry, onClose, onSaved }) {
  const [name,           setName]           = useState(entry.name);
  const [phone,          setPhone]          = useState(entry.phone || '');
  const [priority,       setPriority]       = useState(entry.priority);
  const [currentMedCase, setCurrentMedCase] = useState('');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  const cases    = entry.medical_cases ?? [];
  const lastCase = cases.length > 0 ? cases[cases.length - 1].case : null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name:                 name.trim(),
        phone:                phone.trim() || null,
        priority,
        current_medical_case: currentMedCase.trim() || null,
      };
      const res = await apiClient.put(`/manager/waitlist/${entry.id}`, payload);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Edit Waitlist Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Priority</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'normal', label: 'Normal', active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-white text-gray-600 border-gray-200' },
                { value: 'urgent', label: 'Urgent', active: 'bg-red-500 text-white border-red-500',   inactive: 'bg-white text-gray-600 border-gray-200' },
              ].map((p) => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${priority === p.value ? p.active : p.inactive}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Medical Case</label>
            <div className={`px-4 py-2.5 rounded-xl border text-sm ${
              lastCase ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-gray-100 bg-gray-50 text-gray-400 italic'
            }`}>
              {lastCase || 'No previous case on record'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Add New Medical Case
              <span className="ml-1 text-gray-400 font-normal">(leave blank to keep unchanged)</span>
            </label>
            <textarea value={currentMedCase} onChange={(e) => setCurrentMedCase(e.target.value)}
              rows={2} placeholder="New case to add..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Queue Panel ───────────────────────────────────────────
function LiveQueuePanel({ queue, queueLoading, onRemove, onRefresh }) {
  const items      = queue?.queue       ?? [];
  const total      = queue?.total       ?? 0;
  const waiting    = queue?.waiting     ?? 0;
  const inProgress = queue?.in_progress ?? 0;

  const activeItems = items.filter((i) => ['waiting', 'in_progress'].includes(i.status));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Live Queue</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {total} total · {waiting} waiting · {inProgress} in progress
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title="Refresh queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {queueLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : activeItems.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium">No patients in queue right now.</p>
          <p className="text-xs mt-1 text-gray-300">Patients appear here after check-in.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 px-6 py-3.5 ${
                item.status === 'in_progress' ? 'bg-purple-50/40' : ''
              } ${item.priority === 'emergency' ? 'bg-red-50/40' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                QUEUE_PRIORITY_COLORS[item.priority] ?? 'bg-gray-200 text-gray-600'
              }`}>
                {item.priority === 'emergency' ? '!' : `#${item.position}`}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {item.patient_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{item.dentist_name}</span>
                  {item.appointment_type && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{item.appointment_type}</span>
                    </>
                  )}
                </div>
                {item.notes && (
                  <p className="text-[10px] text-amber-600 mt-0.5 truncate">{item.notes}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-gray-600">{item.wait_minutes} min</p>
                <p className="text-[10px] text-gray-400">wait</p>
              </div>

              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                item.status === 'in_progress'
                  ? 'bg-purple-100 text-purple-700'
                  : item.priority === 'emergency'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {item.status === 'in_progress'
                  ? 'In Progress'
                  : item.priority === 'emergency'
                  ? 'EMERGENCY'
                  : 'Waiting'}
              </span>

              {item.status === 'waiting' && (
                <button
                  onClick={() => onRemove(item.id, item.patient_name)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagerWaitlist() {
  const [entries,      setEntries]      = useState([]);
  const [meta,         setMeta]         = useState({ total: 0, waiting: 0, in_service: 0, done: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dentists,     setDentists]     = useState([]);
  const [toast,        setToast]        = useState(null);
  const [addOpen,      setAddOpen]      = useState(false);
  const [editEntry,    setEditEntry]    = useState(null);
  const [convertEntry, setConvertEntry] = useState(null);
  const [converting,   setConverting]   = useState(false);

  // ── Queue state ────────────────────────────────────────────
  const [queue,        setQueue]        = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const pollingRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  // ── Fetch waitlist ─────────────────────────────────────────
  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search)                 params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const [waitRes, staffRes] = await Promise.all([
        apiClient.get('/manager/waitlist', { params }),
        apiClient.get('/manager/staff'),
      ]);
      setEntries(waitRes.data.data  || []);
      setMeta(waitRes.data.meta     || { total: 0, waiting: 0, in_service: 0, done: 0 });
      setDentists((staffRes.data.data || []).filter((s) => s.role === 'dentist' && s.is_active));
    } catch {
      setError('Failed to load waitlist.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // ── Fetch live queue ───────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      setQueueLoading(true);
      const data = await getQueue();
      setQueue(data);
    } catch {
      // silent
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

  // ── Queue load + polling every 20 seconds ──────────────────
  useEffect(() => {
    fetchQueue();
    pollingRef.current = setInterval(fetchQueue, 20000);
    return () => clearInterval(pollingRef.current);
  }, [fetchQueue]);

  // ── Handlers ───────────────────────────────────────────────
  const handleStatusChange = async (entry, status) => {
    try {
      await apiClient.put(`/manager/waitlist/${entry.id}`, { status });
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status } : e));
      showToast(`${entry.name} status updated.`);
    } catch {
      showToast('Failed to update status.', 'error');
    }
  };

  const handleRemove = async (entry) => {
    if (!window.confirm(`Remove ${entry.name} from waitlist?`)) return;
    try {
      await apiClient.delete(`/manager/waitlist/${entry.id}`);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showToast(`${entry.name} removed.`);
    } catch {
      showToast('Failed to remove.', 'error');
    }
  };

  const handleQueueRemove = async (id, patientName) => {
    if (!window.confirm(`Remove ${patientName} from queue?`)) return;
    try {
      await removeFromQueue(id);
      showToast(`${patientName} removed from queue.`);
      fetchQueue();
    } catch {
      showToast('Failed to remove from queue.', 'error');
    }
  };

  const handleConvertToEmergency = async (convertData) => {
    setConverting(true);
    try {
      const res = await convertWaitlistToAppointment(convertEntry.id, convertData);
      showToast(res.message || 'Converted to emergency appointment.');
      setConvertEntry(null);
      fetchWaitlist();
      // Refresh queue immediately after emergency conversion
      fetchQueue();
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Failed to convert.', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleSaved = (updated) => {
    setEntries((prev) => {
      const exists = prev.find((e) => e.id === updated.id);
      if (exists) return prev.map((e) => e.id === updated.id ? updated : e);
      return [updated, ...prev];
    });
    fetchWaitlist();
    fetchQueue();
    showToast('Waitlist updated.');
  };

  const urgentEntries = entries.filter((e) => e.priority === 'urgent'  && e.status === 'waiting');
  const normalEntries = entries.filter((e) => e.priority === 'normal'  && e.status === 'waiting');
  const activeEntries = entries.filter((e) => ['called','in_service'].includes(e.status));
  const doneEntries   = entries.filter((e) => ['done','left','removed'].includes(e.status));

  const displayEntries = statusFilter === 'all'
    ? [...urgentEntries, ...activeEntries, ...normalEntries, ...doneEntries]
    : entries.filter((e) => e.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {addOpen && (
        <WaitlistRegistrationModal
          role="manager"
          onClose={() => setAddOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {editEntry && (
        <EditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={handleSaved}
        />
      )}

      {convertEntry && (
        <ConvertToEmergencyModal
          entry={convertEntry}
          dentists={dentists}
          onClose={() => setConvertEntry(null)}
          onConfirm={handleConvertToEmergency}
          converting={converting}
        />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Branch Manager</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waitlist & Live Queue</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage walk-in patients and monitor the live appointment queue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchWaitlist(); fetchQueue(); }}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add to Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: meta.total,          color: 'text-gray-900',   bg: 'bg-gray-50',   border: 'border-gray-200'  },
          { label: 'Waiting',     value: meta.waiting,        color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
          { label: 'In Service',  value: meta.in_service,     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
          { label: 'In Queue',    value: queue?.waiting ?? 0, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200'},
        ].map((card) => (
          <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-5`}>
            <p className="text-xs text-gray-500 mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── LIVE QUEUE PANEL ──────────────────────────────── */}
      <LiveQueuePanel
        queue={queue}
        queueLoading={queueLoading}
        onRemove={handleQueueRemove}
        onRefresh={fetchQueue}
      />

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone..."
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {urgentEntries.length > 0 && statusFilter === 'all' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            {urgentEntries.length} urgent patient{urgentEntries.length > 1 ? 's' : ''} waiting — prioritize immediately
          </p>
        </div>
      )}

      {/* Waitlist section header */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-gray-900">Waitlist</h2>
        <span className="text-xs text-gray-400 font-medium">
          Walk-in patients and scheduled waitlist
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No patients in waitlist.</p>
          <button onClick={() => setAddOpen(true)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            Add first patient
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayEntries.map((entry, index) => (
            <WaitlistCard
              key={entry.id}
              entry={entry}
              index={index}
              dentists={dentists}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
              onEdit={setEditEntry}
              onConvert={setConvertEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}