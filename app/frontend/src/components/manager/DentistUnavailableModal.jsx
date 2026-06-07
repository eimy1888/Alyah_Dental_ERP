import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, UserX, Calendar, Clock, Users } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

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

const REASON_OPTIONS = [
  { value: 'sick_leave', label: 'Sick Leave', icon: '🤒', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'vacation', label: 'Vacation', icon: '🏖️', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'late_arrival', label: 'Late Arrival', icon: '⏰', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'left_early', label: 'Left Early', icon: '🏃', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'emergency', label: 'Emergency', icon: '🚨', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'other', label: 'Other', icon: '📝', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export default function DentistUnavailableModal({ onClose, onSuccess }) {
  const [dentists, setDentists] = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [reason, setReason] = useState('');
  const [unavailableUntil, setUnavailableUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignDentistId, setReassignDentistId] = useState('');
  const [availableDentists, setAvailableDentists] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    const fetchDentists = async () => {
      try {
        const res = await apiClient.get('/manager/dentist-unavailable/dentists');
        setDentists(res.data.data || []);
      } catch (err) {
        setError('Failed to load dentists.');
      } finally {
        setLoading(false);
      }
    };
    fetchDentists();
  }, []);

  const selectedDentist = dentists.find(d => d.id === parseInt(selectedDentistId));

  const handleDentistSelect = async (dentistId) => {
    setSelectedDentistId(dentistId);
    setAffectedCount(0);
    setShowReassign(false);
    setReassignDentistId('');
    setAvailableDentists([]);

    if (dentistId) {
      try {
        const res = await apiClient.get(`/manager/dentist-unavailable/${dentistId}/affected-appointments`);
        setAffectedCount(res.data.data?.total || 0);
      } catch (err) {
        console.error('Failed to load affected appointments');
      }
    }
  };

  const handleFetchAvailableDentists = async () => {
    if (!selectedDentistId) return;
    try {
      const res = await apiClient.get(`/manager/dentist-unavailable/${selectedDentistId}/available-dentists`);
      setAvailableDentists(res.data.data || []);
      setShowReassign(true);
    } catch (err) {
      setError('Failed to load available dentists for reassignment.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedDentistId) {
      setError('Please select a dentist.');
      return;
    }
    if (!reason) {
      setError('Please select a reason.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Mark dentist as unavailable
      const payload = {
        dentist_id: selectedDentistId,
        reason,
        unavailable_until: unavailableUntil || null,
        notes: notes || null,
      };
      const markRes = await apiClient.post('/manager/dentist-unavailable/mark', payload);

      // If reassign all was requested
      if (showReassign && reassignDentistId && affectedCount > 0) {
        await apiClient.post('/manager/dentist-unavailable/reassign-all', {
          dentist_id: selectedDentistId,
          to_dentist_id: reassignDentistId,
          reason: `Dentist marked as unavailable (${REASON_OPTIONS.find(r => r.value === reason)?.label})${notes ? ': ' + notes : ''}`,
        });
        showToast(`Dentist marked unavailable. ${affectedCount} appointments reassigned.`);
      } else {
        showToast(markRes.data.message || 'Dentist marked as unavailable.');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to mark dentist as unavailable.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedReason = REASON_OPTIONS.find(r => r.value === reason);

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <div>
              <h2 className="text-base font-bold text-gray-900">Mark Dentist Unavailable</h2>
              <p className="text-xs text-gray-400 mt-0.5">Handle absences and reassign appointments</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Select Dentist */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Select Dentist <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dentists.map((dentist) => (
                    <button
                      key={dentist.id}
                      onClick={() => handleDentistSelect(dentist.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        selectedDentistId === dentist.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          selectedDentistId === dentist.id ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <UserX className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">{dentist.name}</p>
                          <p className="text-xs text-gray-400">{dentist.specialization || 'General Dentist'}</p>
                        </div>
                      </div>
                      {dentist.is_available === false && (
                        <span className="text-xs text-red-500 font-semibold">Already Unavailable</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Dentist Info */}
            {selectedDentist && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">Upcoming Appointments</p>
                  <span className="text-lg font-bold text-gray-700">{affectedCount}</span>
                </div>
                {affectedCount > 0 && (
                  <button
                    onClick={handleFetchAvailableDentists}
                    className="w-full mt-2 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users className="w-3 h-3" /> Reassign All to Another Dentist
                  </button>
                )}
              </div>
            )}

            {/* Reassign Section */}
            {showReassign && availableDentists.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Reassign to:
                </p>
                <div className="space-y-2">
                  {availableDentists.map((dentist) => (
                    <button
                      key={dentist.id}
                      onClick={() => setReassignDentistId(dentist.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        reassignDentistId === dentist.id
                          ? 'border-blue-500 bg-blue-100'
                          : 'border-blue-200 bg-white hover:bg-blue-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{dentist.name}</p>
                        <p className="text-xs text-gray-500">{dentist.specialization || 'General Dentist'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{dentist.queue_length || 0} in queue</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReason(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      reason === opt.value
                        ? opt.color
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unavailable Until */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Unavailable Until <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  value={unavailableUntil}
                  onChange={(e) => setUnavailableUntil(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave empty for indefinite absence</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes about the absence..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
              />
            </div>

            {/* Summary */}
            {selectedDentist && selectedReason && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-2">Summary</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Dentist:</span> {selectedDentist.name}</p>
                  <p><span className="text-gray-500">Reason:</span> {selectedReason.label}</p>
                  {unavailableUntil && (
                    <p><span className="text-gray-500">Until:</span> {new Date(unavailableUntil).toLocaleString()}</p>
                  )}
                  {affectedCount > 0 && (
                    <p><span className="text-gray-500">Affected:</span> {affectedCount} appointment{affectedCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedDentistId || !reason}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                'Confirm & Mark Unavailable'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}