import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Search, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toHHMM = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const nowDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

/**
 * Given a dentist object (from availability API), find the nearest free slot
 * at or after `currentTimeStr` ("HH:MM"). Returns "HH:MM" or null.
 */
function nearestFreeSlot(dentistData, currentTimeStr, durationMin) {
  const nowMin = toMin(currentTimeStr);
  const slots  = dentistData?.free_slots ?? [];
  for (const slot of [...slots].sort((a, b) => toMin(a) - toMin(b))) {
    const slotMin = toMin(slot);
    if (slotMin < nowMin) continue;
    // check it ends within working hours (no crossing lunch)
    const slotEnd = slotMin + durationMin;
    const wh = dentistData?.working_hours;
    if (wh) {
      const mEnd = wh.morning?.enabled ? toMin(wh.morning.end) : 0;
      const aStart = wh.afternoon?.enabled ? toMin(wh.afternoon.start) : 9999;
      if (slotMin < mEnd && slotEnd > mEnd) continue;   // crosses morning end
      if (slotMin >= aStart && slotEnd > toMin(wh.afternoon?.end ?? '99:99')) continue;
    }
    return slot;
  }
  return null;
}

// ── Patient search ────────────────────────────────────────────────────────────
function PatientSearchField({ role, onSelect, selectedPatient, onClear }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen]         = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const base = role === 'manager' ? '/manager' : '/receptionist';
        const res = await apiClient.get(`${base}/patients`, { params: { search: query, per_page: 8 } });
        setResults(res.data.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, role]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        Patient Name <span className="text-red-500">*</span>
      </label>
      {selectedPatient ? (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50">
          <div>
            <p className="text-sm font-semibold text-blue-900">{selectedPatient.full_name}</p>
            <p className="text-xs text-blue-500">
              {selectedPatient.phone}
              {selectedPatient.gender ? ` · ${selectedPatient.gender}` : ''}
              {selectedPatient.age ? ` · ${selectedPatient.age} yrs` : ''}
            </p>
          </div>
          <button type="button" onClick={onClear} className="text-blue-400 hover:text-blue-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search registered patient by name or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {results.map((p) => (
                <button key={p.id} type="button"
                  onClick={() => { onSelect(p); setQuery(''); setOpen(false); setResults([]); }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                  <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                  <p className="text-xs text-gray-400">{p.phone}{p.gender ? ` · ${p.gender}` : ''}{p.age ? ` · ${p.age} yrs` : ''}</p>
                  {p.last_medical_case && <p className="text-xs text-blue-500 mt-0.5 truncate">Last: {p.last_medical_case}</p>}
                </button>
              ))}
            </div>
          )}
          {open && results.length === 0 && query.length >= 2 && !searching && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-400">
              No registered patients found. Enter details manually below.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function WaitlistRegistrationModal({ role = 'receptionist', onClose, onSaved }) {
  const base = role === 'manager' ? '/manager' : '/receptionist';

  const [selectedPatient,   setSelectedPatient]   = useState(null);
  const [priority,          setPriority]          = useState('normal');
  const [name,              setName]              = useState('');
  const [phone,             setPhone]             = useState('');
  const [currentMedCase,    setCurrentMedCase]    = useState('');
  const [lastMedCase,       setLastMedCase]       = useState('');

  // Dentist + service
  const [dentists,          setDentists]          = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [services,          setServices]          = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Urgent auto-assignment
  const [urgentDentist,     setUrgentDentist]     = useState(null);   // { id, name, slotTime }
  const [urgentLoading,     setUrgentLoading]     = useState(false);

  // Normal availability check
  const [checkingAvail,     setCheckingAvail]     = useState(false);
  const [slotAvailable,     setSlotAvailable]     = useState(null);
  const [estimatedEndTime,  setEstimatedEndTime]  = useState(null);

  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [loadError, setLoadError] = useState('');

  // ── Load dentists + services ──────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const dentistEndpoint = role === 'manager' ? '/manager/dentists' : '/receptionist/appointments/dentists';
        const [dRes, sRes] = await Promise.all([
          apiClient.get(dentistEndpoint),
          apiClient.get(`${base}/services`),
        ]);
        setDentists(dRes.data.data ?? []);
        setServices(sRes.data.data ?? []);
        if (!dRes.data.data?.length) setLoadError('No dentists found for this branch.');
      } catch (err) {
        const msg = err?.response?.data?.message || 'Failed to load dentists and services';
        setLoadError(msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [base, role]);

  // ── URGENT: auto-assign when priority=urgent + service selected ───────────
  useEffect(() => {
    if (priority !== 'urgent' || !dentists.length || !selectedServiceId) {
      setUrgentDentist(null);
      return;
    }

    const run = async () => {
      setUrgentLoading(true);
      setUrgentDentist(null);
      try {
        const service  = services.find(s => s.id === parseInt(selectedServiceId));
        const duration = service?.duration_minutes ?? 30;
        const today    = nowDate();
        const now      = nowHHMM();

        // Fetch availability for today for all dentists at once
        const res = await apiClient.get(`${base}/appointments/availability`, {
          params: { date: today, duration },
        });
        const availDentists = res.data.data?.dentists ?? [];

        // Build [ { dentist, slot, waitMin } ] for each dentist that has a free slot now
        const candidates = [];
        for (const dentist of dentists) {
          const avail = availDentists.find(d => d.id === dentist.id || d.user_id === dentist.user_id);
          if (!avail) continue;

          // Prefer emergency specialist, then general — check by specialization
          const slot = nearestFreeSlot(avail, now, duration);
          if (!slot) continue;

          const waitMin = Math.max(0, toMin(slot) - toMin(now));
          const spec    = (dentist.specialization ?? '').toLowerCase();
          // Score: 0 = emergency spec, 1 = general, 2 = other
          const score   = spec.includes('oral') || spec.includes('emergency') ? 0
                        : spec === '' || spec.includes('general') ? 1
                        : 2;

          candidates.push({ dentist, slot, waitMin, score });
        }

        if (!candidates.length) {
          setUrgentDentist(null);
          setUrgentLoading(false);
          return;
        }

        // Sort: prefer lowest score (emergency spec), then least wait
        candidates.sort((a, b) => a.score - b.score || a.waitMin - b.waitMin);
        const best = candidates[0];

        setUrgentDentist({ ...best.dentist, slotTime: best.slot, waitMin: best.waitMin });
        setSelectedDentistId(String(best.dentist.id));
      } catch (err) {
        console.error('Urgent auto-assign failed:', err);
        setUrgentDentist(null);
      } finally {
        setUrgentLoading(false);
      }
    };

    run();
  }, [priority, selectedServiceId, dentists, services, base]);

  // ── NORMAL: check availability when dentist + service selected ────────────
  useEffect(() => {
    if (priority === 'urgent') return;   // handled above
    if (!selectedDentistId || !selectedServiceId) {
      setSlotAvailable(null);
      setEstimatedEndTime(null);
      return;
    }

    const check = async () => {
      setCheckingAvail(true);
      try {
        const service  = services.find(s => s.id === parseInt(selectedServiceId));
        const duration = service?.duration_minutes ?? 30;
        const now      = new Date();

        const res = await apiClient.get(`${base}/appointments/availability`, {
          params: { date: nowDate(), dentist_id: selectedDentistId, duration },
        });

        const avail    = res.data.data?.dentists?.find(d => d.id === parseInt(selectedDentistId));
        const slot     = nearestFreeSlot(avail, nowHHMM(), duration);

        setSlotAvailable(!!slot);
        if (slot) {
          const [h, m] = slot.split(':').map(Number);
          const end = new Date(now);
          end.setHours(h, m + duration, 0, 0);
          setEstimatedEndTime(end);
        } else {
          setEstimatedEndTime(null);
        }
      } catch {
        setSlotAvailable(false);
      } finally {
        setCheckingAvail(false);
      }
    };
    check();
  }, [selectedDentistId, selectedServiceId, priority, base, services]);

  // ── Patient select ────────────────────────────────────────────────────────
  const handlePatientSelect = (p) => {
    setSelectedPatient(p);
    setName(p.full_name || '');
    setPhone(p.phone || '');
    setLastMedCase(p.last_medical_case || '');
  };
  const handlePatientClear = () => {
    setSelectedPatient(null); setName(''); setPhone(''); setLastMedCase(''); setCurrentMedCase('');
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('');
    if (!name.trim())        { setError('Patient name is required.'); return; }
    if (!selectedServiceId)  { setError('Please select a service type.'); return; }

    // For urgent: use auto-assigned dentist
    const dentistId = priority === 'urgent'
      ? (urgentDentist?.id ?? null)
      : (selectedDentistId ? parseInt(selectedDentistId) : null);

    if (!dentistId) {
      if (priority === 'urgent') {
        setError('No available dentist found right now. Please add manually or try normal priority.');
      } else {
        setError('Please select a dentist.');
      }
      return;
    }

    const payload = {
      patient_id:           selectedPatient?.id ?? null,
      name:                 name.trim(),
      phone:                phone.trim() || null,
      current_medical_case: currentMedCase.trim() || null,
      priority,
      dentist_id:           dentistId,
      service_id:           parseInt(selectedServiceId),
    };

    setSaving(true);
    try {
      const res = await apiClient.post(`${base}/waitlist`, payload);
      if (res.data.direct_conversion) {
        onSaved(res.data.data, { message: 'Patient added to live queue immediately.', type: 'success' });
      } else {
        onSaved(res.data.data, { message: 'No slot available. Patient added to waitlist.', type: 'warning' });
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add to waitlist.');
    } finally {
      setSaving(false);
    }
  };

  const isUrgent         = priority === 'urgent';
  const canSave          = !saving && !loading
    && (isUrgent ? (!!selectedServiceId && (!!urgentDentist || !urgentLoading)) : (!!selectedDentistId && !!selectedServiceId))
    && !!name.trim();

  const selectedService  = services.find(s => s.id === parseInt(selectedServiceId));
  const patientGender    = selectedPatient?.gender ?? null;
  const patientAge       = selectedPatient?.age ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add to Waitlist</h2>
            <p className="text-xs text-gray-400 mt-0.5">Walk-in or registered patient</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}
          {loadError && !loading && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
              ⚠️ {loadError}
            </div>
          )}

          {/* ── Priority ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setPriority('normal'); setUrgentDentist(null); setSelectedDentistId(''); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  priority === 'normal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}>
                <CheckCircle2 className="w-4 h-4" /> Normal
              </button>
              <button type="button" onClick={() => { setPriority('urgent'); setSelectedDentistId(''); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  priority === 'urgent' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                }`}>
                <AlertTriangle className="w-4 h-4" /> Urgent
              </button>
            </div>
          </div>

          {/* ── Patient search ── */}
          <PatientSearchField role={role} onSelect={handlePatientSelect} selectedPatient={selectedPatient} onClear={handlePatientClear} />

          {/* ── Name ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Patient full name"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
          </div>

          {/* ── Phone ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+251 9xx xxx xxx"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
          </div>

          {/* ── Gender + Age (read-only) ── */}
          {selectedPatient && (patientGender || patientAge) && (
            <div className="grid grid-cols-2 gap-3">
              {patientGender && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gender</label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600 capitalize">{patientGender}</div>
                </div>
              )}
              {patientAge && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Age</label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600">{patientAge} years</div>
                </div>
              )}
            </div>
          )}

          {/* ── Last Medical Case ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Last Medical Case <span className="text-gray-400 font-normal">(from patient history)</span>
            </label>
            <div className={`px-4 py-2.5 rounded-xl border text-sm min-h-[42px] ${
              lastMedCase ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-gray-100 bg-gray-50 text-gray-400 italic'
            }`}>
              {lastMedCase || 'No previous case on record'}
            </div>
          </div>

          {/* ── Current Medical Case ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Current Medical Case <span className="text-gray-400 font-normal">(reason for today's visit)</span>
            </label>
            <textarea value={currentMedCase} onChange={(e) => setCurrentMedCase(e.target.value)}
              placeholder="Describe the current complaint or reason for visit..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors resize-none" />
          </div>

          {/* ── Service Type ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Service Type <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                No services available.
              </div>
            ) : (
              <select value={selectedServiceId}
                onChange={(e) => { setSelectedServiceId(e.target.value); setSlotAvailable(null); setUrgentDentist(null); }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
                <option value="">Select service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes} min) — ETB {Number(s.price).toLocaleString()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── URGENT: auto-assigned dentist banner ── */}
          {isUrgent && selectedServiceId && (
            <div className={`p-4 rounded-xl border ${
              urgentLoading ? 'bg-gray-50 border-gray-200' :
              urgentDentist ? 'bg-red-50 border-red-200' :
                              'bg-amber-50 border-amber-200'
            }`}>
              {urgentLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Finding nearest available dentist…
                </div>
              ) : urgentDentist ? (
                <div>
                  <div className="flex items-center gap-2 text-red-700 text-sm font-bold mb-1">
                    <Zap className="w-4 h-4" /> Auto-assigned for Urgent
                  </div>
                  <p className="text-sm font-semibold text-red-800">
                    Dr. {urgentDentist.name}
                    {urgentDentist.specialization ? ` · ${urgentDentist.specialization}` : ' · General Dentistry'}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    <Clock className="inline w-3 h-3 mr-1" />
                    Nearest free slot: <strong>{urgentDentist.slotTime}</strong>
                    {urgentDentist.waitMin === 0
                      ? ' — available NOW'
                      : ` — ~${urgentDentist.waitMin} min wait`}
                  </p>
                  <p className="text-[10px] text-red-400 mt-1">
                    Patient will be placed at the <strong>TOP</strong> of the queue immediately.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4" /> No free slot found right now
                  </div>
                  <p className="text-xs text-amber-600">
                    No dentist has an available slot at this moment. Patient will be added to waitlist and assigned when a slot opens.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── NORMAL: manual dentist selector ── */}
          {!isUrgent && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Assign Dentist <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading dentists...
                </div>
              ) : dentists.length === 0 ? (
                <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                  No dentists available.
                </div>
              ) : (
                <select value={selectedDentistId}
                  onChange={(e) => { setSelectedDentistId(e.target.value); setSlotAvailable(null); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="">Select dentist...</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.specialization ? ` (${d.specialization})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── NORMAL: availability status ── */}
          {!isUrgent && selectedDentistId && selectedServiceId && (
            <div className={`p-4 rounded-xl border ${
              slotAvailable === true  ? 'bg-green-50 border-green-200' :
              slotAvailable === false ? 'bg-amber-50 border-amber-200' :
                                        'bg-gray-50 border-gray-200'
            }`}>
              {checkingAvail ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking availability...
                </div>
              ) : slotAvailable === true ? (
                <div>
                  <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Slot Available!
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Duration: {selectedService?.duration_minutes} min
                    {estimatedEndTime && ` · Ready by: ${estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Patient will enter live queue at the BOTTOM immediately.</p>
                </div>
              ) : slotAvailable === false ? (
                <div>
                  <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold">
                    <Clock className="w-4 h-4" /> No Slot Available
                  </div>
                  <p className="text-xs text-amber-600 mt-1">No free slot for this dentist right now.</p>
                  <p className="text-xs text-gray-500 mt-1">Patient will be added to waitlist until a slot opens.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Medical history ── */}
          {selectedPatient?.medical_cases?.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Medical History ({selectedPatient.medical_cases.length} cases)
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {[...selectedPatient.medical_cases].reverse().map((mc, idx) => (
                  <div key={idx} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 mt-0.5 shrink-0">
                      {idx === 0 ? 'LATEST' : `#${selectedPatient.medical_cases.length - idx}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-relaxed">{mc.case}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(mc.added_at).toLocaleDateString()} · {mc.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
              isUrgent ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
              : isUrgent
              ? <><Zap className="w-4 h-4" /> Add Urgent</>
              : <><Save className="w-4 h-4" /> Add to Waitlist</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
