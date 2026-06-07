import { useState, useEffect } from 'react';
import { Calendar, Clock, Stethoscope, MapPin, X, Eye, AlertCircle, Plus } from 'lucide-react';
import { getAppointments, markDelayed, createAppointment } from '../../services/patientService';
import AppointmentRegistrationModal from '../../components/appointment/AppointmentRegistrationModal';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
};

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  // ── Delay state ──────────────────────────────────────
  const [delayModal, setDelayModal] = useState(null);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [submittingDelay, setSubmittingDelay] = useState(false);

  const showToastMessage = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params = { page, per_page: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await getAppointments(params);
      setAppointments(response.data || []);
      setPagination({
        current_page: response.meta?.current_page || 1,
        last_page: response.meta?.last_page || 1,
        total: response.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load appointments:', error);
      showToastMessage('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, page]);

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  const handleMarkDelayed = async () => {
    if (!delayModal) return;
    setSubmittingDelay(true);
    try {
      const res = await markDelayed(delayModal.id, {
        estimated_arrival_minutes: delayMinutes,
      });
      showToastMessage(res.message || 'Delay reported', 'success');
      setDelayModal(null);
      loadAppointments();
    } catch (error) {
      showToastMessage(error.response?.data?.message || 'Failed to report delay', 'error');
    } finally {
      setSubmittingDelay(false);
    }
  };

  const handleBookingSaved = (data, warnings) => {
    showToastMessage('Appointment request submitted! Receptionist will confirm soon.', 'success');
    setShowBookingModal(false);
    loadAppointments();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <AppointmentRegistrationModal
          role="patient"
          onClose={() => setShowBookingModal(false)}
          onSaved={handleBookingSaved}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Appointment Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedAppointment.type}</p>
                  <p className="text-xs text-gray-500">with Dr. {selectedAppointment.dentist_name}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Date</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{formatDate(selectedAppointment.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Time</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{selectedAppointment.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Branch</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{selectedAppointment.branch_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4" />
                    <span className="text-sm text-gray-500">Status</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[selectedAppointment.status]}`}>
                    {statusLabels[selectedAppointment.status]}
                  </span>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div className="mt-4 p-4 rounded-xl bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Doctor's Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {delayModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">Running Late?</h3>
              </div>
              <button onClick={() => setDelayModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-sm font-semibold text-gray-800">{delayModal.type}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{delayModal.date}</span>
                  <span>{delayModal.time}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Estimated delay
                </label>
                <select
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400 transition-colors bg-white"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <p className="text-xs text-gray-500">
                We'll notify the clinic and adjust your queue position accordingly.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setDelayModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDelayed}
                disabled={submittingDelay}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
              >
                {submittingDelay ? 'Reporting...' : 'Report Delay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Patient Portal
        </p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-sm text-gray-500 mt-1">
              View all your past and upcoming appointments.
            </p>
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none focus:border-blue-400"
        >
          <option value="all">All Appointments</option>
          <option value="confirmed">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <p className="text-sm text-gray-500">
          {pagination.total} appointment{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No appointments found</p>
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
            <button
              onClick={() => setShowBookingModal(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Book Your First Appointment
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewDetails(apt)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        apt.is_upcoming ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Stethoscope className={`w-5 h-5 ${apt.is_upcoming ? 'text-blue-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{apt.type}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">{formatDate(apt.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">{apt.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500">Dr. {apt.dentist_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {apt.is_upcoming && apt.status === 'confirmed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDelayModal({
                              id: apt.id,
                              type: apt.type,
                              date: formatDate(apt.date),
                              time: apt.time,
                            });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                        >
                          <AlertCircle className="w-3 h-3" /> I'm Delayed
                        </button>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[apt.status]}`}>
                        {statusLabels[apt.status]}
                      </span>
                      <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Page {pagination.current_page} of {pagination.last_page}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}