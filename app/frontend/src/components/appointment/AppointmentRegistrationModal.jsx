import { useState, useEffect, useRef } from 'react';
import {
  X, Save, Loader2, Search, User as UserIcon, Clock,
  Stethoscope, Wrench,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import { getEthiopianDate, toEthiopianTime } from '../../lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
const localDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayDate    = () => localDateStr(0);
const tomorrowDate = () => localDateStr(1);

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Always returns a real array — guards against JSON strings from API
const toArr = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; }
  catch { return []; }
};

const CATEGORY_LABELS = {
  general:       'General',
  preventive:    'Preventive',
  restorative:   'Restorative',
  cosmetic:      'Cosmetic',
  surgical:      'Surgical',
  emergency:     'Emergency',
  orthodontics:  'Orthodontics',
  diagnostics:   'Diagnostics',
  pediatric:     'Pediatric',
  implants:      'Implants',
  prosthodontics:'Prosthodontics',
};

const EMPTY_FORM = {
  patient_id:        '',
  dentist_id:        '',
  appointment_date:  tomorrowDate(),
  appointment_time:  '',
  duration_minutes:  30,
  service_type:      '',
  service_name:      '',
  notes:             '',
};

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
        const res  = await apiClient.get(`${base}/patients`, { params: { search: query, per_page: 8 } });
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
        Patient <span className="text-red-500">*</span>
      </label>
      {selectedPatient ? (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50">
          <div>
            <p className="text-sm font-semibold text-blue-900">{selectedPatient.full_name}</p>
            <p className="text-xs text-blue-500">
              {selectedPatient.phone}
              {selectedPatient.gender ? ` · ${selectedPatient.gender}` : ''}
              {selectedPatient.age    ? ` · ${selectedPatient.age} yrs` : ''}
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
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type patient name or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
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
                </button>
              ))}
            </div>
          )}
          {open && results.length === 0 && query.length >= 2 && !searching && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-400">
              No patients found.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function AppointmentRegistrationModal({
  role    = 'receptionist',
  onClose,
  onSaved,
  prefill = null,
}) {
  const base = role === 'manager' ? '/manager' : role === 'patient' ? '/patient' : '/receptionist';

  const [bookingMode,     setBookingMode]     = useState(null);
  const [serviceCategory, setServiceCategory] = useState('');
  const [selectedService, setSelectedService] = useState(null);

  // Treatment: auto-assigned dentist (least busy general dentist)
  const [autoAssignedDentist, setAutoAssignedDentist] = useState(null);

  const [patientData,    setPatientData]    = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [prefillTime,    setPrefillTime]    = useState(prefill?.appointment_time ?? '');

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    appointment_date: prefill?.appointment_date ?? tomorrowDate(),
    dentist_id:       prefill?.dentist_id ?? '',
  });

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [allDentists,     setAllDentists]     = useState([]);
  const [services,        setServices]        = useState([]);
  const [availability,    setAvailability]    = useState(null);
  const [loadingInit,     setLoadingInit]     = useState(true);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  const [selectedRange, setSelectedRange] = useState(null);
  const [customTime,    setCustomTime]    = useState('');

  // ── Sync prefill ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!prefill) return;
    setPrefillTime(prefill.appointment_time || '');
    setForm(prev => ({
      ...prev,
      dentist_id:       prefill.dentist_id       ? String(prefill.dentist_id) : prev.dentist_id,
      appointment_date: prefill.appointment_date || prev.appointment_date,
      appointment_time: '',
    }));
    setAvailability(null);
    setSelectedRange(null);
    setCustomTime('');
  }, [prefill]);

  // ── Patient role: load own profile ────────────────────────────────────────
  useEffect(() => {
    if (role !== 'patient') return;
    const load = async () => {
      setLoadingPatient(true);
      try {
        const res = await apiClient.get('/patient/settings/profile');
        const p   = res.data.data;
        setPatientData(p);
        setSelectedPatient({ id: p.id, full_name: p.full_name || p.name, phone: p.phone });
        setForm(prev => ({ ...prev, patient_id: p.id }));
      } catch { setError('Failed to load your profile.'); }
      finally  { setLoadingPatient(false); }
    };
    load();
  }, [role]);

  // ── Load dentists + services ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      try {
        let dentistRes, serviceRes;
        if (role === 'manager') {
          [dentistRes, serviceRes] = await Promise.all([
            apiClient.get('/manager/dentists'),
            apiClient.get(`${base}/services`),
          ]);
        } else if (role === 'patient') {
          [dentistRes, serviceRes] = await Promise.all([
            apiClient.get('/patient/appointments/dentists'),
            apiClient.get('/patient/services'),
          ]);
        } else {
          [dentistRes, serviceRes] = await Promise.all([
            apiClient.get('/receptionist/appointments/dentists'),
            apiClient.get(`${base}/services`),
          ]);
        }
        setAllDentists(dentistRes.data.data ?? []);
        setServices((serviceRes.data.data ?? []).filter((s) => s.is_active !== false));
      } catch { setError('Failed to load required data.'); }
      finally  { setLoadingInit(false); }
    };
    load();
  }, [role, base]);

  // ── Auto-assign dentist when mode/service changes ────────────────────────
  useEffect(() => {
    if (!allDentists.length) return;

    if (bookingMode === 'treatment') {
      // TREATMENT: always use General Dentistry only
      const generals = allDentists.filter((d) => {
        const spec = (d.specialization ?? '').toLowerCase().trim();
        return spec === '' || spec === 'general dentistry';
      });
      const pool = generals.length > 0 ? generals : allDentists;
      // Pick least-busy (smallest estimated_wait_minutes)
      const best = [...pool].sort((a, b) =>
        (a.estimated_wait_minutes ?? 999) - (b.estimated_wait_minutes ?? 999)
      )[0];
      setAutoAssignedDentist(best);
      setForm(prev => ({ ...prev, dentist_id: String(best.id) }));
    } else if (bookingMode === 'service' && selectedService) {
      // SERVICE: filter by required_specializations, then pick least-busy
      const specs = toArr(selectedService.required_specializations);
      let pool = allDentists;
      if (specs.length > 0) {
        const matched = allDentists.filter((d) =>
          specs.some((s) =>
            (d.specialization ?? 'General Dentistry').toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes((d.specialization ?? 'General Dentistry').toLowerCase())
          )
        );
        if (matched.length > 0) pool = matched;
      }
      const best = [...pool].sort((a, b) =>
        (a.estimated_wait_minutes ?? 999) - (b.estimated_wait_minutes ?? 999)
      )[0];
      setAutoAssignedDentist(best);
      setForm(prev => ({ ...prev, dentist_id: String(best.id), appointment_time: '' }));
    }
  }, [bookingMode, selectedService, allDentists]);

  // ── Fetch availability when dentist + date are set ───────────────────────
  useEffect(() => {
    if (!form.dentist_id || !form.appointment_date) { setAvailability(null); return; }
    let cancelled = false;

    const fetchAvail = async () => {
      setLoadingSlots(true);
      setError('');
      setSelectedRange(null);
      setCustomTime('');
      try {
        const url = role === 'patient'
          ? '/patient/appointments/availability'
          : `${base}/appointments/availability`;

        const res  = await apiClient.get(url, {
          params: { date: form.appointment_date, dentist_id: form.dentist_id, duration: form.duration_minutes },
        });
        if (cancelled) return;

        const avail = res.data.data;
        setAvailability(avail);

        // Auto-pick first free window for treatment mode
        if (bookingMode === 'treatment' && !prefillTime) {
          const dentist = avail?.dentists?.find((d) => String(d.id) === String(form.dentist_id));
          const wins    = dentist?.free_windows ?? [];
          if (wins.length > 0) {
            const first = wins[0];
            setSelectedRange(first);
            setCustomTime(first.start);
            setForm(p => ({ ...p, appointment_time: first.start }));
          }
        }

        if (prefillTime) {
          const dData  = avail?.dentists?.find((d) => String(d.id) === String(form.dentist_id));
          const windows = dData?.free_windows ?? [];
          const matchWin = windows.find(
            (w) => prefillTime >= w.start && toMinutes(prefillTime) + form.duration_minutes <= toMinutes(w.end)
          );
          if (matchWin) {
            setSelectedRange(matchWin);
            setCustomTime(prefillTime);
            setForm(p => ({ ...p, appointment_time: prefillTime }));
          }
        }
      } catch (err) {
        if (cancelled) return;
        setAvailability(null);
        setError(err.response?.data?.message || 'Failed to load availability.');
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };

    fetchAvail();
    return () => { cancelled = true; };
  }, [form.dentist_id, form.appointment_date, form.duration_minutes, role, base, prefillTime, bookingMode]);

  // ── Derived: filtered dentists for service path ───────────────────────────
  const filteredDentists = (() => {
    if (!allDentists.length) return [];
    if (bookingMode === 'service' && selectedService) {
      const specs = toArr(selectedService.required_specializations);
      if (specs.length === 0) return allDentists;
      const matched = allDentists.filter((d) =>
        specs.some((s) =>
          (d.specialization ?? 'General Dentistry').toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes((d.specialization ?? 'General Dentistry').toLowerCase())
        )
      );
      return matched.length > 0 ? matched : allDentists;
    }
    // Treatment: only general dentists
    if (bookingMode === 'treatment') {
      const generals = allDentists.filter((d) => {
        const spec = (d.specialization ?? '').toLowerCase().trim();
        return spec === '' || spec === 'general dentistry';
      });
      return generals.length > 0 ? generals : allDentists;
    }
    return allDentists;
  })();

  const serviceCategories = [...new Set(services.map((s) => s.category).filter(Boolean))];
  const filteredServices  = serviceCategory
    ? services.filter((s) => s.category === serviceCategory)
    : services;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const resetAfterModeChange = () => {
    setSelectedService(null);
    setAutoAssignedDentist(null);
    setServiceCategory('');
    setForm({ ...EMPTY_FORM, appointment_date: form.appointment_date });
    setAvailability(null);
    setSelectedRange(null);
    setCustomTime('');
    setError('');
  };

  const handleModeSelect = (mode) => {
    setBookingMode(mode);
    resetAfterModeChange();
  };

  const handleServiceSelect = (svc) => {
    setSelectedService(svc);
    setAutoAssignedDentist(null); // will be re-assigned by the useEffect
    setForm(prev => ({
      ...prev,
      service_type:     String(svc.id),
      service_name:     svc.name,
      duration_minutes: svc.duration_minutes ?? 30,
      dentist_id:       '',
      appointment_time: '',
    }));
    setAvailability(null);
    setSelectedRange(null);
    setCustomTime('');
  };

  const handleDentistChange = (e) => {
    setForm(p => ({ ...p, dentist_id: e.target.value, appointment_time: '' }));
    setPrefillTime('');
    setAvailability(null);
    setSelectedRange(null);
    setCustomTime('');
    setError('');
  };

  const handlePatientSelect = (p) => {
    setSelectedPatient(p);
    setForm(prev => ({ ...prev, patient_id: p.id }));
  };
  const handlePatientClear = () => {
    setSelectedPatient(null);
    setForm(prev => ({ ...prev, patient_id: '' }));
  };

  const handleDateChange = (e) => {
    setForm(p => ({ ...p, appointment_date: e.target.value, appointment_time: '' }));
    setPrefillTime('');
    setSelectedRange(null);
    setCustomTime('');
    setError('');
  };

  const handleRangeSelect = (range) => {
    setSelectedRange(range);
    setCustomTime(range.start);
    setForm(p => ({ ...p, appointment_time: range.start }));
    setError('');
  };

  const handleCustomTimeChange = (e) => {
    const val = e.target.value;
    setCustomTime(val);
    if (!val || !selectedRange) return;
    const valMin   = toMinutes(val);
    const startMin = toMinutes(selectedRange.start);
    const endMin   = toMinutes(selectedRange.end);
    if (valMin >= startMin && (valMin + form.duration_minutes) <= endMin) {
      setForm(p => ({ ...p, appointment_time: val }));
      setError('');
    } else {
      setError(`Time must allow ${form.duration_minutes} min within ${selectedRange.start}–${selectedRange.end}`);
      setForm(p => ({ ...p, appointment_time: '' }));
    }
  };

  // ── Derived: availability data ────────────────────────────────────────────
  const dentistAvail   = availability?.dentists?.find((d) => String(d.id) === String(form.dentist_id));
  const morningHours   = dentistAvail?.working_hours?.morning;
  const afternoonHours = dentistAvail?.working_hours?.afternoon;
  // Only block booking (not view) when clinic is closed
  const isClosed = availability?.is_closed === true;

  const buildWindowsFromSlots = (slots, duration) => {
    if (!slots?.length) return [];
    const sorted = [...slots].sort((a, b) => toMinutes(a) - toMinutes(b));
    const windows = [];
    let winStart = sorted[0];
    let prev = toMinutes(sorted[0]);
    for (let i = 1; i < sorted.length; i++) {
      const curr = toMinutes(sorted[i]);
      if (curr !== prev + duration) {
        windows.push({ start: winStart, end: `${String(Math.floor((prev+duration)/60)).padStart(2,'0')}:${String((prev+duration)%60).padStart(2,'0')}` });
        winStart = sorted[i];
      }
      prev = curr;
    }
    windows.push({ start: winStart, end: `${String(Math.floor((prev+duration)/60)).padStart(2,'0')}:${String((prev+duration)%60).padStart(2,'0')}` });
    return windows;
  };

  const rawWindows = dentistAvail?.free_windows?.length
    ? dentistAvail.free_windows
    : buildWindowsFromSlots(dentistAvail?.free_slots ?? [], form.duration_minutes);

  const freeRanges = rawWindows.filter(
    (w) => toMinutes(w.end) - toMinutes(w.start) >= form.duration_minutes
  );

  const isTimeValid = (() => {
    if (!form.appointment_time || !selectedRange) return false;
    const valMin   = toMinutes(form.appointment_time);
    const startMin = toMinutes(selectedRange.start);
    const endMin   = toMinutes(selectedRange.end);
    return valMin >= startMin && (valMin + form.duration_minutes) <= endMin;
  })();

  const isPatientRole = role === 'patient';
  const isLoading     = loadingInit || (isPatientRole && loadingPatient);

  // Treatment: show date/time immediately after mode selected (dentist auto-assigned)
  const showDateTimeForTreatment = bookingMode === 'treatment' && form.dentist_id;
  const showDateTimeForService   = bookingMode === 'service' && selectedService && form.dentist_id;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('');
    if (!form.patient_id)       { setError('Please select a patient.'); return; }
    if (!bookingMode)           { setError('Please choose Service or Treatment.'); return; }
    if (bookingMode === 'service' && !selectedService) { setError('Please select a service.'); return; }
    if (!form.dentist_id)       { setError('Please select a dentist.'); return; }
    if (!form.appointment_date) { setError('Please select a date.'); return; }
    if (!form.appointment_time) { setError('Please select an appointment time.'); return; }
    if (!isTimeValid && freeRanges.length > 0) {
      setError('Selected time does not fit within a free period.'); return;
    }

    const appointmentDatetime = `${form.appointment_date} ${form.appointment_time}:00`;
    const appointmentStatus   = (role === 'receptionist' || role === 'manager') ? 'confirmed' : 'pending';

    const selectedDentistObj  = filteredDentists.find((d) => String(d.id) === String(form.dentist_id))
                               ?? allDentists.find((d) => String(d.id) === String(form.dentist_id));
    const dentistIdForPayload = role === 'manager'
      ? Number(form.dentist_id)
      : (selectedDentistObj?.user_id ? Number(selectedDentistObj.user_id) : Number(form.dentist_id));

    const payload = {
      patient_id:       form.patient_id,
      dentist_id:       dentistIdForPayload,
      appointment_time: appointmentDatetime,
      duration_minutes: Number(form.duration_minutes),
      type:             bookingMode === 'service'
                          ? (selectedService?.name ?? 'Consultation')
                          : 'General Treatment',
      notes:            form.notes || '',
      status:           appointmentStatus,
      service_id:       bookingMode === 'service' ? (selectedService?.id ?? null) : null,
      billing_model:    bookingMode === 'service' ? 'service' : 'treatment',
    };

    setSaving(true);
    try {
      const endpoint = role === 'patient' ? '/patient/appointments'
                     : role === 'manager' ? '/manager/appointments'
                     :                      '/receptionist/appointments';
      const res = await apiClient.post(endpoint, payload);
      onSaved(res.data.data, res.data.warnings ?? []);
      onClose();
    } catch (err) {
      const response = err?.response?.data;
      if (response?.code === 'CARD_REQUIRED') {
        setError(response.message);
        if (window.confirm(`${response.message}\n\nGo to billing to complete payment?`)) {
          window.location.href = role === 'manager' ? '/manager/billing' : '/receptionist/billing';
        }
      } else {
        setError(response?.message || 'Failed to book appointment.');
      }
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && !isLoading && isTimeValid && !!form.patient_id;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isPatientRole ? 'Request Appointment' : 'New Appointment'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Patient → {bookingMode === 'service' ? 'Service → Dentist' : bookingMode === 'treatment' ? 'Auto-assigned dentist' : 'Mode'} → Date → Time
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* ── STEP 1: Patient ── */}
              {isPatientRole ? (
                patientData && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">{patientData.full_name || patientData.name}</p>
                        <p className="text-xs text-blue-500">{patientData.phone}</p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <PatientSearchField
                  role={role}
                  onSelect={handlePatientSelect}
                  selectedPatient={selectedPatient}
                  onClear={handlePatientClear}
                />
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {isPatientRole ? 'Reason for Visit' : 'Notes / Last Medical Case'}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={isPatientRole ? 'Describe your complaint...' : 'Add notes...'}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
                />
              </div>

              {/* ── STEP 2: Mode ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Booking Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleModeSelect('service')}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                      bookingMode === 'service' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}>
                    <div className="flex items-center gap-2">
                      <Stethoscope className={`w-4 h-4 ${bookingMode === 'service' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${bookingMode === 'service' ? 'text-blue-700' : 'text-gray-700'}`}>Service</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">Pick a specific service (cleaning, whitening, filling…)</p>
                  </button>

                  <button type="button" onClick={() => handleModeSelect('treatment')}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                      bookingMode === 'treatment' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-300'
                    }`}>
                    <div className="flex items-center gap-2">
                      <Wrench className={`w-4 h-4 ${bookingMode === 'treatment' ? 'text-violet-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${bookingMode === 'treatment' ? 'text-violet-700' : 'text-gray-700'}`}>Treatment</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">See a dentist — doctor decides procedures</p>
                  </button>
                </div>
              </div>

              {/* ── TREATMENT: auto-assigned dentist banner ── */}
              {bookingMode === 'treatment' && autoAssignedDentist && (
                <div className="px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
                  <p className="text-xs font-semibold text-violet-700 mb-0.5">
                    Auto-assigned: <strong>Dr. {autoAssignedDentist.name}</strong>
                    {autoAssignedDentist.specialization ? ` · ${autoAssignedDentist.specialization}` : ' · General Dentistry'}
                  </p>
                  <p className="text-[10px] text-violet-500">
                    Least-busy available dentist — 
                    {autoAssignedDentist.estimated_wait_minutes > 0
                      ? ` ~${autoAssignedDentist.estimated_wait_minutes} min wait`
                      : ' available now'}
                  </p>
                  {/* Allow manual override */}
                  <select
                    value={form.dentist_id}
                    onChange={handleDentistChange}
                    className="mt-2 w-full px-3 py-1.5 rounded-lg border border-violet-300 text-xs outline-none bg-white text-violet-700"
                  >
                    {allDentists.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name}{d.specialization ? ` (${d.specialization})` : ' (General)'}
                        {d.estimated_wait_minutes > 0 ? ` — ${d.estimated_wait_minutes}m wait` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── SERVICE: category filter + service list ── */}
              {bookingMode === 'service' && (
                <div className="space-y-3">
                  {serviceCategories.length > 1 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => setServiceCategory('')}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            serviceCategory === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                          }`}>All</button>
                        {serviceCategories.map((cat) => (
                          <button key={cat} type="button" onClick={() => setServiceCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              serviceCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                            }`}>
                            {CATEGORY_LABELS[cat] ?? cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">
                      Select Service <span className="text-red-500">*</span>
                    </p>
                    {filteredServices.length === 0 ? (
                      <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                        No services available. Please contact clinic admin.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {filteredServices.map((svc) => {
                          const isSelected = selectedService?.id === svc.id;
                          const specs = toArr(svc.required_specializations);
                          return (
                            <button key={svc.id} type="button" onClick={() => handleServiceSelect(svc)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                              }`}>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                                  {svc.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-gray-400">{svc.duration_minutes} min</span>
                                  {svc.price > 0 && <span className="text-[10px] text-gray-400">ETB {Number(svc.price).toLocaleString()}</span>}
                                  {specs.length > 0 && <span className="text-[10px] text-blue-500 font-semibold">{specs.join(', ')}</span>}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="ml-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-[10px] font-bold">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Duration + auto-assigned dentist for service */}
                  {selectedService && (
                    <>
                      <div className="flex items-center px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm">
                        <Clock className="w-3.5 h-3.5 text-gray-400 mr-2" />
                        <span className="font-bold text-blue-600 text-lg">{form.duration_minutes}</span>
                        <span className="ml-1 text-gray-400">minutes</span>
                        {toArr(selectedService.required_specializations).length > 0 && (
                          <span className="ml-auto text-[10px] text-blue-500 font-semibold">
                            {toArr(selectedService.required_specializations).join(' / ')} only
                          </span>
                        )}
                      </div>

                      {/* Auto-assigned dentist banner */}
                      {autoAssignedDentist && (
                        <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-xs font-semibold text-blue-700 mb-0.5">
                            Auto-assigned: <strong>Dr. {autoAssignedDentist.name}</strong>
                            {autoAssignedDentist.specialization
                              ? ` · ${autoAssignedDentist.specialization}`
                              : ' · General Dentistry'}
                          </p>
                          <p className="text-[10px] text-blue-500 mb-2">
                            Least-busy matching dentist —
                            {autoAssignedDentist.estimated_wait_minutes > 0
                              ? ` ~${autoAssignedDentist.estimated_wait_minutes} min wait`
                              : ' available now'}
                          </p>
                          {/* Override dropdown */}
                          {filteredDentists.length > 1 && (
                            <select value={form.dentist_id} onChange={handleDentistChange}
                              className="w-full px-3 py-1.5 rounded-lg border border-blue-300 text-xs outline-none bg-white text-blue-700">
                              {filteredDentists.map((d) => (
                                <option key={d.id} value={d.id}>
                                  Dr. {d.name}
                                  {d.specialization ? ` (${d.specialization})` : ' (General)'}
                                  {d.estimated_wait_minutes > 0 ? ` — ${d.estimated_wait_minutes}m wait` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Date (shown when dentist is set) ── */}
              {(showDateTimeForTreatment || showDateTimeForService) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.appointment_date}
                    min={isPatientRole ? tomorrowDate() : todayDate()}
                    onChange={handleDateChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              )}

              {/* ── Time slots ── */}
              {(showDateTimeForTreatment || showDateTimeForService) && form.appointment_date && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Appointment Time <span className="text-red-500">*</span>
                  </label>

                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability…
                    </div>
                  ) : isClosed ? (
                    <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-700 font-semibold">🏥 Today's clinic hours have ended.</p>
                      <p className="text-xs text-amber-500 mt-1">Select a future date to book.</p>
                    </div>
                  ) : (
                    <>
                      {dentistAvail && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {morningHours?.enabled && (
                            <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-semibold">
                              ጥዋት: {toEthiopianTime(morningHours.start)} – {toEthiopianTime(morningHours.end)}
                              <span className="text-blue-400 font-normal ml-1">({morningHours.start}–{morningHours.end})</span>
                            </span>
                          )}
                          {afternoonHours?.enabled && (
                            <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-semibold">
                              ቀን: {toEthiopianTime(afternoonHours.start)} – {toEthiopianTime(afternoonHours.end)}
                              <span className="text-indigo-400 font-normal ml-1">({afternoonHours.start}–{afternoonHours.end})</span>
                            </span>
                          )}
                        </div>
                      )}

                      {freeRanges.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-400">
                            {freeRanges.length} free period{freeRanges.length !== 1 ? 's' : ''} — click to select:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {freeRanges.map((range) => {
                              const isSel = selectedRange?.start === range.start && selectedRange?.end === range.end;
                              return (
                                <button key={`${range.start}-${range.end}`} type="button"
                                  onClick={() => handleRangeSelect(range)}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    isSel ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                  }`}>
                                  <Clock className="w-3 h-3" />
                                  {toEthiopianTime(range.start)} – {toEthiopianTime(range.end)}
                                  <span className={`font-normal text-[9px] ${isSel ? 'text-blue-200' : 'text-green-500'}`}>
                                    ({range.start}–{range.end})
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {selectedRange && (
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                              <p className="text-xs font-semibold text-blue-700 mb-2">
                                Set exact start time within <span className="font-bold">{toEthiopianTime(selectedRange.start)} – {toEthiopianTime(selectedRange.end)}</span>:
                              </p>
                              <input
                                type="time"
                                value={customTime}
                                min={selectedRange.start}
                                max={selectedRange.end}
                                step="60"
                                onChange={handleCustomTimeChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-blue-300 text-sm outline-none focus:border-blue-500 bg-white font-semibold text-blue-900"
                              />
                              {isTimeValid ? (
                                <p className="text-xs text-green-600 font-semibold mt-1.5">
                                  ✓ <strong>{toEthiopianTime(customTime)}</strong>
                                  <span className="text-green-500 font-normal"> ({customTime})</span>
                                  {' '}→ ends {(() => {
                                    const endMin = toMinutes(form.appointment_time) + form.duration_minutes;
                                    const endStr = `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`;
                                    return <><strong>{toEthiopianTime(endStr)}</strong><span className="text-green-500 font-normal"> ({endStr})</span></>;
                                  })()}
                                </p>
                              ) : customTime ? (
                                <p className="text-xs text-amber-600 mt-1.5">
                                  ⚠ Must allow {form.duration_minutes} min within {selectedRange.start}–{selectedRange.end}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : !loadingSlots ? (
                        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                          <p className="text-xs text-amber-700 font-medium">No free slots on this date.</p>
                          <p className="text-xs text-amber-500 mt-1">Try a different date or dentist.</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              {/* Status banner */}
              {form.appointment_time && isTimeValid && (
                <div className={`px-4 py-3 rounded-xl border ${isPatientRole ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                  {isPatientRole ? (
                    <p className="text-xs text-amber-700 font-semibold">ℹ️ Your request starts as <strong>Pending</strong> until reviewed.</p>
                  ) : (
                    <>
                      <p className="text-xs text-blue-700 font-semibold">ℹ️ Appointment will be created as <strong>Confirmed</strong>.</p>
                      <p className="text-xs text-blue-500 mt-0.5">Patient can check in on arrival.</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors ${
              isPatientRole ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {isPatientRole ? 'Submitting…' : 'Booking…'}</>
            ) : (
              <><Save className="w-4 h-4" /> {isPatientRole ? 'Request Appointment' : 'Book Appointment'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
