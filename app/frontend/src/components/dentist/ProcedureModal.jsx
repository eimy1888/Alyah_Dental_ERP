import { useState, useEffect } from 'react';
import {
  X, Save, Loader2, Stethoscope, AlertCircle,
  Trash2, Receipt, CheckCircle,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';

export default function ProcedureModal({ appointment, onClose, onSuccess }) {
  const [services,            setServices]            = useState([]);
  const [existingProcedures,  setExistingProcedures]  = useState([]);
  const [invoiceSummary,      setInvoiceSummary]      = useState(null);
  const [loadingInit,         setLoadingInit]         = useState(true);
  const [submitting,          setSubmitting]          = useState(false);
  const [deleting,            setDeleting]            = useState(null);
  const [error,               setError]               = useState('');
  const [successMsg,          setSuccessMsg]          = useState('');

  const [form, setForm] = useState({
    service_id:   '',
    tooth_number: '',
    notes:        '',
    quantity:     1,
  });

  // ── Load services + existing procedures ───────────────
  const loadData = async () => {
    setLoadingInit(true);
    setError('');
    try {
      const [servicesRes, proceduresRes] = await Promise.all([
        apiClient.get('/dentist/settings/services'),
        apiClient.get(`/dentist/procedures/appointment/${appointment.id}`),
      ]);

      const serviceList = servicesRes.data.data || [];
      setServices(serviceList);

      // Pre-select first service if none selected
      if (serviceList.length > 0) {
        setForm(f => ({ ...f, service_id: String(serviceList[0].id) }));
      }

      const procedureData = proceduresRes.data.data;
      setExistingProcedures(procedureData.procedures || []);
      setInvoiceSummary({
        id:      procedureData.invoice_id,
        status:  procedureData.invoice_status,
        total:   procedureData.invoice_total,
        balance: procedureData.invoice_balance,
      });
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please close and try again.');
    } finally {
      setLoadingInit(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedService = services.find(
    (s) => String(s.id) === String(form.service_id)
  );

  const lineTotal = selectedService
    ? Number(selectedService.price) * form.quantity
    : 0;

  // ── Add procedure ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.service_id) {
      setError('Please select a service.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await apiClient.post('/dentist/procedures', {
        appointment_id: appointment.id,
        service_id:     form.service_id,
        tooth_number:   form.tooth_number || null,
        notes:          form.notes        || null,
        quantity:       form.quantity,
      });

      setSuccessMsg(`${selectedService?.name} added successfully.`);

      // Reset form fields (keep service selected for quick repeated entry)
      setForm(f => ({ ...f, tooth_number: '', notes: '', quantity: 1 }));

      // Reload to show updated list + invoice
      await loadData();

      // Notify parent to refresh appointments list
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add procedure.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Remove procedure ───────────────────────────────────
  const handleDelete = async (procedureId) => {
    setDeleting(procedureId);
    setError('');
    setSuccessMsg('');
    try {
      await apiClient.delete(`/dentist/procedures/${procedureId}`);
      setSuccessMsg('Procedure removed.');
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to remove procedure.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">
              Treatment Recording
            </p>
            <h2 className="text-white text-xl font-bold mt-0.5">Add Procedure</h2>
            <p className="text-blue-200 text-xs mt-1">
              Patient: <span className="font-semibold">{appointment.patient_name}</span>
              <span className="ml-2 opacity-70">
                · APT-{String(appointment.id).padStart(4, '0')}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 font-medium">{successMsg}</p>
            </div>
          )}

          {loadingInit ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* ── Existing procedures list ── */}
              {existingProcedures.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Procedures Added ({existingProcedures.length})
                    </h3>
                    {invoiceSummary?.id && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Invoice #{invoiceSummary.id}
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          invoiceSummary.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {invoiceSummary.status?.toUpperCase()}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {existingProcedures.map((proc) => (
                      <div
                        key={proc.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {proc.name}
                            {proc.tooth_number && (
                              <span className="ml-1 text-xs text-gray-400 font-normal">
                                (Tooth #{proc.tooth_number})
                              </span>
                            )}
                          </p>
                          {proc.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{proc.notes}</p>
                          )}
                          <p className="text-xs text-blue-600 font-semibold mt-1">
                            ETB {Number(proc.price).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(proc.id)}
                          disabled={deleting === proc.id}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                          title="Remove procedure"
                        >
                          {deleting === proc.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Invoice running total */}
                  {invoiceSummary && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-semibold">Invoice Total</span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-800">
                          ETB {Number(invoiceSummary.total).toLocaleString()}
                        </p>
                        {invoiceSummary.balance > 0 && (
                          <p className="text-xs text-amber-600">
                            Balance due: ETB {Number(invoiceSummary.balance).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 my-4" />
                </div>
              )}

              {/* ── Add new procedure form ── */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Add New Procedure
                </h3>

                {/* Service selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Service / Procedure <span className="text-red-500">*</span>
                    </label>
                    {services.length === 0 ? (
                      <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                        No services configured. Ask clinic admin to add services.
                      </div>
                    ) : (
                      <select
                        value={form.service_id}
                        onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
                      >
                        <option value="">Select procedure...</option>
                        {services.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} · {s.duration_minutes} min
                            · ETB {Number(s.price).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Service preview */}
                  {selectedService && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Duration</p>
                          <p className="font-semibold text-gray-800">
                            {selectedService.duration_minutes} min
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Unit Price</p>
                          <p className="font-semibold text-blue-700">
                            ETB {Number(selectedService.price).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">
                            Total (×{form.quantity})
                          </p>
                          <p className="font-bold text-blue-800">
                            ETB {lineTotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {selectedService.description && (
                        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-100">
                          {selectedService.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  {/* Tooth Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Tooth Number{' '}
                      <span className="text-gray-400 font-normal">(optional · FDI system)</span>
                    </label>
                    <input
                      type="text"
                      value={form.tooth_number}
                      onChange={(e) => setForm({ ...form, tooth_number: e.target.value })}
                      placeholder="e.g., 14, 21, 36"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Clinical Notes{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      placeholder="e.g., Caries on mesial surface, patient tolerated well..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-colors"
          >
            {existingProcedures.length > 0 ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loadingInit || !form.service_id || services.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
              : <><Stethoscope className="w-4 h-4" /> Add Procedure</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}