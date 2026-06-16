import { useState, useEffect } from 'react';
import {
  X, Save, Loader2, FlaskConical, UserCheck, ClipboardList,
  Stethoscope, CheckCircle2, AlertTriangle, Plus, Trash2,
  CreditCard,
} from 'lucide-react';
import {
  createTreatmentPlan,
  getDiagnosticServices,
  orderDiagnosticTest,
  getDentistServices,
} from '../../services/dentistService';

const fmt = (n) => `ETB ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const LAB_FEES = {
  crown:        500,
  bridge:       500,
  denture:      800,
  aligner:      1200,
  implant_crown:700,
  veneer:       600,
  other:        500,
};

// ── Step indicator ─────────────────────────────────────────────
function Steps({ step }) {
  const steps = ['Diagnosis', 'Procedures', 'Review & Submit'];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
            i < step ? 'bg-violet-600 text-white' :
            i === step ? 'bg-violet-100 text-violet-700 border-2 border-violet-400' :
            'bg-gray-100 text-gray-400'
          }`}>{i < step ? '✓' : i + 1}</div>
          <p className={`ml-1.5 text-[10px] font-semibold hidden sm:block whitespace-nowrap ${
            i === step ? 'text-violet-700' : i < step ? 'text-violet-500' : 'text-gray-400'
          }`}>{s}</p>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-violet-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function TreatmentPlanModal({ appointment, onClose, onSuccess }) {
  const [step, setStep]           = useState(0);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [services, setServices]   = useState([]);
  const [diagServices, setDiagServices] = useState([]);
  const [loadingSvc, setLoadingSvc] = useState(true);

  // Step 0 — Diagnosis
  const [title,     setTitle]     = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes,     setNotes]     = useState('');
  const [sessions,  setSessions]  = useState(1);

  // Step 1 — Procedures + Diagnostics
  const [selectedSvcs,  setSelectedSvcs]  = useState([]);
  const [svcSearch,     setSvcSearch]     = useState('');
  const [diagTab,       setDiagTab]       = useState('planned');
  const [selectedDiag,  setSelectedDiag]  = useState(null);
  const [diagNotes,     setDiagNotes]     = useState('');
  const [orderingDiag,  setOrderingDiag]  = useState(false);
  const [diagOrdered,   setDiagOrdered]   = useState([]);

  // Step 2 — Lab + Specialist
  const [requiresLab,       setRequiresLab]       = useState(false);
  const [labOrderType,      setLabOrderType]      = useState('crown');
  const [labMaterial,       setLabMaterial]       = useState('');
  const [requiresSpecialist,setRequiresSpecialist]= useState(false);
  const [specialistType,    setSpecialistType]    = useState('');

  useEffect(() => {
    setLoadingSvc(true);
    Promise.all([
      getDentistServices().catch(() => []),
      getDiagnosticServices().catch(() => []),
    ]).then(([svcs, diag]) => {
      setServices(Array.isArray(svcs) ? svcs : (svcs?.data ?? []));
      setDiagServices(Array.isArray(diag) ? diag : (diag?.data ?? []));
    }).finally(() => setLoadingSvc(false));
  }, []);

  const filteredSvcs = services.filter(s =>
    !s.is_diagnostic && s.name.toLowerCase().includes(svcSearch.toLowerCase())
  );

  const toggleSvc = (svc) => setSelectedSvcs(prev =>
    prev.find(s => s.id === svc.id) ? prev.filter(s => s.id !== svc.id) : [...prev, svc]
  );

  const labFee = requiresLab ? (LAB_FEES[labOrderType] ?? 500) : 0;
  const invoiceTotal = selectedSvcs.reduce((s, v) => s + parseFloat(v.price || 0), 0) + labFee;

  const canNext = () => {
    if (step === 0) return title.trim().length > 0 && diagnosis.trim().length > 0;
    if (step === 1) return true;
    return !requiresSpecialist || specialistType.trim().length > 0;
  };

  const handleOrderDiag = async () => {
    if (!selectedDiag) return;
    setOrderingDiag(true);
    setError('');
    try {
      const res = await orderDiagnosticTest({
        appointment_id: appointment.id,
        service_id: selectedDiag.id,
        notes: diagNotes || undefined,
      });
      setDiagOrdered(prev => [...prev, { ...selectedDiag, invoice_number: res.data?.invoice_number }]);
      setSelectedDiag(null);
      setDiagNotes('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to order test.');
    } finally { setOrderingDiag(false); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await createTreatmentPlan({
        appointment_id:         appointment.id,
        title:                  title.trim(),
        diagnosis:              diagnosis.trim(),
        notes:                  notes.trim() || undefined,
        procedure_service_ids:  selectedSvcs.map(s => s.id),
        total_sessions_planned: sessions,
        requires_lab:           requiresLab,
        lab_order_type:         requiresLab ? labOrderType : undefined,
        lab_material:           requiresLab && labMaterial ? labMaterial : undefined,
        requires_specialist:    requiresSpecialist,
        specialist_type:        requiresSpecialist ? specialistType.trim() : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit.');
      setStep(0);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-600" />
              Checkup Complete
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{appointment.patient_name} — Invoice will be generated as UNPAID</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <Steps step={step} />

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* ── STEP 0: Diagnosis ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Root Canal — Tooth #26"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Diagnosis <span className="text-red-500">*</span></label>
                <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={4}
                  placeholder="Clinical findings, chief complaint, diagnosis…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sessions Needed</label>
                <input type="number" min={1} max={50} value={sessions}
                  onChange={e => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Optional internal notes…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 resize-none" />
              </div>
            </div>
          )}

          {/* ── STEP 1: Procedures + Diagnostics ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[['planned', 'Procedures'], ['diagnostic', 'Diagnostic Test']].map(([k, label]) => (
                  <button key={k} onClick={() => setDiagTab(k)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      diagTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>{label}</button>
                ))}
              </div>

              {diagTab === 'planned' && (
                <>
                  <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)}
                    placeholder="Search services…"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
                  {loadingSvc ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {filteredSvcs.length === 0 && <p className="text-xs text-gray-400 py-2">No services found.</p>}
                      {filteredSvcs.map(svc => {
                        const sel = !!selectedSvcs.find(s => s.id === svc.id);
                        return (
                          <button key={svc.id} onClick={() => toggleSvc(svc)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all ${
                              sel ? 'border-violet-500 bg-violet-50' : 'border-gray-100 hover:border-violet-200'
                            }`}>
                            <div>
                              <p className={`text-sm font-semibold ${sel ? 'text-violet-800' : 'text-gray-800'}`}>{svc.name}</p>
                              <p className="text-[10px] text-gray-400">{svc.duration_minutes} min · {fmt(svc.price)}</p>
                            </div>
                            {sel && <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedSvcs.length > 0 && (
                    <div className="px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 space-y-1">
                      <p className="text-xs font-bold text-violet-700">Selected ({selectedSvcs.length})</p>
                      {selectedSvcs.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="text-violet-800">{s.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-violet-600 font-semibold">{fmt(s.price)}</span>
                            <button onClick={() => toggleSvc(s)} className="text-violet-300 hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {diagTab === 'diagnostic' && (
                <div className="space-y-4">
                  <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                    Diagnostic tests are billed <strong>immediately and separately</strong>. Patient pays at front desk before test.
                  </div>
                  {diagOrdered.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-gray-600">Ordered this session:</p>
                      {diagOrdered.map((d, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-xs">
                          <span className="font-semibold text-green-800">{d.name}</span>
                          <span className="text-green-600">{fmt(d.price)} <CheckCircle2 className="inline w-3 h-3" /></span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {diagServices.length === 0
                      ? <p className="text-xs text-gray-400">No diagnostic services configured.</p>
                      : diagServices.map(svc => (
                          <button key={svc.id} onClick={() => setSelectedDiag(svc)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all ${
                              selectedDiag?.id === svc.id ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-amber-200'
                            }`}>
                            <p className="text-sm font-semibold text-gray-800">{svc.name}</p>
                            <p className="text-xs text-gray-400">{fmt(svc.price)}</p>
                          </button>
                        ))
                    }
                  </div>
                  {selectedDiag && (
                    <>
                      <input value={diagNotes} onChange={e => setDiagNotes(e.target.value)}
                        placeholder="Notes for test…"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400" />
                      <button onClick={handleOrderDiag} disabled={orderingDiag}
                        className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-60">
                        {orderingDiag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Order {selectedDiag.name} — {fmt(selectedDiag.price)}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Lab + Specialist + Review ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Lab */}
              <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${requiresLab ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => setRequiresLab(!requiresLab)}>
                <div className="flex items-center gap-3">
                  <FlaskConical className={`w-5 h-5 ${requiresLab ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${requiresLab ? 'text-blue-800' : 'text-gray-700'}`}>Lab Work Required</p>
                    <p className="text-[10px] text-gray-400">Fee included in invoice (no separate billing)</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${requiresLab ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {requiresLab && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                </div>
                {requiresLab && (
                  <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                    <select value={labOrderType} onChange={e => setLabOrderType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-blue-200 text-sm outline-none bg-white">
                      {Object.entries(LAB_FEES).map(([t, fee]) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')} — ETB {fee.toLocaleString()}</option>
                      ))}
                    </select>
                    <input value={labMaterial} onChange={e => setLabMaterial(e.target.value)}
                      placeholder="Material (e.g. Zirconia, PFM, Acrylic)"
                      className="w-full px-3 py-2 rounded-xl border border-blue-200 text-sm outline-none" />
                  </div>
                )}
              </div>

              {/* Specialist */}
              <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${requiresSpecialist ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'}`}
                onClick={() => setRequiresSpecialist(!requiresSpecialist)}>
                <div className="flex items-center gap-3">
                  <UserCheck className={`w-5 h-5 ${requiresSpecialist ? 'text-violet-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${requiresSpecialist ? 'text-violet-800' : 'text-gray-700'}`}>Specialist Referral</p>
                    <p className="text-[10px] text-gray-400">Auto-scheduled by system after payment</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${requiresSpecialist ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                    {requiresSpecialist && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                </div>
                {requiresSpecialist && (
                  <div className="mt-3" onClick={e => e.stopPropagation()}>
                    <select value={specialistType} onChange={e => setSpecialistType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm outline-none bg-white">
                      <option value="">Select specialist…</option>
                      {['Endodontist','Orthodontist','Oral Surgeon','Prosthodontist','Periodontist','Pediatric Dentist'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Invoice Preview */}
              <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Invoice Will Be Generated</p>
                {selectedSvcs.map(s => (
                  <div key={s.id} className="flex justify-between text-xs">
                    <span className="text-gray-700">{s.name}</span>
                    <span className="font-semibold">{fmt(s.price)}</span>
                  </div>
                ))}
                {requiresLab && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700">Lab — {labOrderType.replace(/_/g,' ')}</span>
                    <span className="font-semibold">{fmt(labFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                  <span>Total (excl. VAT)</span><span>{fmt(invoiceTotal)}</span>
                </div>
              </div>

              {/* Payment gate notice */}
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Invoice will be generated as <strong>UNPAID</strong>. Patient must pay <strong>100% before treatment starts</strong>. Accountant will be notified immediately.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {step < 2 ? (
            <button onClick={() => { setError(''); setStep(s => s + 1); }}
              disabled={!canNext()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving || (!requiresSpecialist ? false : !specialistType)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Generating Invoice…' : 'Submit & Generate Invoice'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
