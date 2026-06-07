import { useState, useEffect } from 'react';
import { X, Loader2, UserRound, Stethoscope, AlertCircle } from 'lucide-react';
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

export default function ReferralModal({ appointment, onClose, onSuccess }) {
  const [dentists, setDentists] = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    const fetchDentists = async () => {
      try {
        const res = await apiClient.get('/dentist/referral/dentists');
        setDentists(res.data.data || []);
      } catch (err) {
        setError('Failed to load available dentists.');
      } finally {
        setLoading(false);
      }
    };
    fetchDentists();
  }, []);

  const handleSubmit = async () => {
    if (!selectedDentistId) {
      setError('Please select a dentist to refer to.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for referral.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiClient.post('/dentist/referral/refer', {
        appointment_id: appointment.id,
        to_dentist_id: selectedDentistId,
        reason: reason.trim(),
      });

      showToast(res.data.message || 'Patient referred successfully.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to refer patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDentist = dentists.find(d => d.id === parseInt(selectedDentistId));

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <div>
              <h2 className="text-base font-bold text-gray-900">Refer Patient</h2>
              <p className="text-xs text-gray-400 mt-0.5">Transfer to another dentist</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Current appointment info */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Current Appointment</p>
              <p className="text-sm font-semibold text-gray-900">{appointment.patient_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{appointment.type} · {appointment.date} at {appointment.time}</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Select Dentist */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Select Dentist to Refer To <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : dentists.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No other dentists available at this branch.
                </div>
              ) : (
                <div className="space-y-2">
                  {dentists.map((dentist) => (
                    <button
                      key={dentist.id}
                      onClick={() => setSelectedDentistId(dentist.id)}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedDentistId === dentist.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        selectedDentistId === dentist.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <UserRound className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{dentist.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {dentist.specialization && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Stethoscope className="w-3 h-3" /> {dentist.specialization}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected dentist info */}
            {selectedDentist && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                <p className="text-xs font-semibold text-green-600">Selected Dentist</p>
                <p className="text-sm font-medium text-gray-800">{selectedDentist.name}</p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Referral Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g., Needs root canal treatment, Orthodontic consultation required..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
              />
            </div>
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
              disabled={submitting || loading || !selectedDentistId || !reason.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Referring...</>
              ) : (
                'Confirm Referral'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}