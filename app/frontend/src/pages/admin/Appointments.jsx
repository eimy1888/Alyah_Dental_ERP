/**
 * Admin Appointments — Real data from API.
 * Clinic admin views all appointments across all branches.
 * Uses the AppointmentRegistrationModal for booking (same as receptionist).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Loader2, CalendarDays, RefreshCw,
  List, LayoutGrid, Clock, CheckCircle2, Users, AlertTriangle,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import AppointmentRegistrationModal from '../../components/appointment/AppointmentRegistrationModal';

// ── Helpers ────────────────────────────────────────────────────────────────────
const statusColors = {
  pending:           'bg-amber-50 text-amber-700 border border-amber-200',
  confirmed:         'bg-blue-50 text-blue-700 border border-blue-200',
  checked_in:        'bg-purple-50 text-purple-700 border border-purple-200',
  in_progress:       'bg-indigo-50 text-indigo-700 border border-indigo-200',
  treatment_started: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  completed:         'bg-green-50 text-green-700 border border-green-200',
  no_show:           'bg-red-50 text-red-700 border border-red-200',
  cancelled:         'bg-gray-100 text-gray-500 border border-gray-200',
};

const statusLabel = {
  pending:           'Pending',
  confirmed:         'Confirmed',
  checked_in:        'Checked In',
  in_progress:       'In Progress',
  treatment_started: 'Treatment Started',
  completed:         'Completed',
  no_show:           'No Show',
  cancelled:         'Cancelled',
};

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
      type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-gray-900'
    }`}>{msg}</div>
  );
}

// ── API helpers (admin prefix) ─────────────────────────────────────────────────
const fetchAppointments = (params) =>
  apiClient.get('/admin/appointments', { params }).then(r => r.data);

const updateStatus = (id, status) =>
  apiClient.put(`/admin/appointments/${id}/status`, { status }).then(r => r.data);

const cancelAppointment = (id) =>
  apiClient.delete(`/admin/appointments/${id}`).then(r => r.data);

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminAppointments() {
  const [appointments,    setAppointments]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [date,            setDate]            = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [search,          setSearch]          = useState('');
  const [pagination,      setPagination]      = useState({ total: 0, current_page: 1, last_page: 1 });
  const [page,            setPage]            = useState(1);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [toast,           setToast]           = useState(null);
  const [deleteId,        setDeleteId]        = useState(null);
  const [deleting,        setDeleting]        = useState(false);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date, page, per_page: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await fetchAppointments(params);

      const data = res?.data?.data ?? res?.data ?? [];
      setAppointments(Array.isArray(data) ? data : []);
      setPagination({
        total:        res?.meta?.total        ?? data.length,
        current_page: res?.meta?.current_page ?? page,
        last_page:    res?.meta?.last_page    ?? 1,
      });
    } catch {
      showToast('Failed to load appointments.', 'error');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [date, page, statusFilter, search, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateStatus(id, status);
      showToast(`Status updated to ${statusLabel[status]}.`);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  const handleCancel = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await cancelAppointment(deleteId);
      showToast('Appointment cancelled.');
      setDeleteId(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to cancel.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const apts = Array.isArray(appointments) ? appointments : [];

  const counts = {
    total:     apts.length,
    pending:   apts.filter(a => ['pending','confirmed'].includes(a.status)).length,
    active:    apts.filter(a => ['checked_in','in_progress','treatment_started'].includes(a.status)).length,
    completed: apts.filter(a => a.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-6">

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modalOpen && (
        <AppointmentRegistrationModal
          role="receptionist"
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); showToast('Appointment booked.'); }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Cancel Appointment</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to cancel this appointment?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm">No</button>
              <button onClick={handleCancel} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Clinic Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">All appointments across every branch.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: counts.total,     icon: CalendarDays, bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'Pending',   value: counts.pending,   icon: Clock,        bg: 'bg-amber-50',  color: 'text-amber-600' },
          { label: 'Active',    value: counts.active,    icon: Users,        bg: 'bg-purple-50', color: 'text-purple-600' },
          { label: 'Completed', value: counts.completed, icon: CheckCircle2, bg: 'bg-green-50',  color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
            <Icon className={`w-7 h-7 ${color} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none">
          <option value="all">All Statuses</option>
          {Object.entries(statusLabel).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search patient..." className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <button onClick={() => { setDate(new Date().toISOString().split('T')[0]); setStatusFilter('all'); setSearch(''); setPage(1); }}
          className="px-4 py-2 text-sm text-blue-600 font-medium hover:text-blue-800">Reset</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : apts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No appointments found for this date and filter.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['TIME', 'PATIENT', 'DENTIST', 'TYPE', 'BRANCH', 'STATUS', 'ACTIONS'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {apts.map(apt => (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900 text-sm">
                          {apt.time_ett ?? apt.time ?? (apt.appointment_time ? new Date(apt.appointment_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—')}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {apt.patient?.full_name ?? apt.patient_name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{apt.dentist?.name ?? apt.dentist_name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{apt.type ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{apt.branch?.name ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[apt.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusLabel[apt.status] ?? apt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {apt.status === 'pending' && (
                            <button onClick={() => handleStatusUpdate(apt.id, 'confirmed')}
                              className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">
                              Confirm
                            </button>
                          )}
                          {!['completed','cancelled','no_show','in_progress','treatment_started'].includes(apt.status) && (
                            <button onClick={() => setDeleteId(apt.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="flex justify-center gap-2 px-6 py-4 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">← Prev</button>
                <span className="px-3 py-1.5 text-sm text-gray-500">
                  {pagination.current_page} / {pagination.last_page}
                </span>
                <button onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))} disabled={page >= pagination.last_page}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
