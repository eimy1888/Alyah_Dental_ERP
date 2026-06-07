import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Search, User as UserIcon, Clock } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import { getEthiopianDate, toEthiopianTime } from '../../lib/utils';

// ── Date helpers ────────────────────────────────────────────────────────
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

const EMPTY_FORM = {
  patient_id:        '',
  dentist_id:        '',
  appointment_date:  tomorrowDate(),
  appointment_time:  '',
  duration_minutes:  30,
  service_type:      '',
  service_name:      '',
  last_medical_case: '',
  notes:             '',
};

// ── Patient search ────────────────────────────────────────────────────────────
function PatientSearchField({ role, onSelect, selectedPatient, onClear }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);
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
      finally   { setSearching(false); }
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
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {results.map((p) => (
                <button key={p.id} type="button"
                  onClick={() => { onSelect(p); setQuery(''); setOpen(false); setResults([]); }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {p.phone}{p.gender ? ` · ${p.gender}` : ''}{p.age ? ` · ${p.age} yrs` : ''}
                  </p>
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

  const [patientData,    setPatientData]    = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [prefillTime,    setPrefillTime]    = useState(prefill?.appointment_time ?? '');

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    appointment_date: prefill?.appointment_date ?? tomorrowDate(),
    appointment_time: '',
    dentist_id:       prefill?.dentist_id ?? '',
  });

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dentists,        setDentists]        = useState([]);
  const [services,        setServices]        = useState([]);
  const [availability,    setAvailability]    = useState(null);
  const [loadingInit,     setLoadingInit]     = useState(true);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  // Range/time selection
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
        const res     = await apiClient.get('/patient/settings/profile');
        const patient = res.data.data;
        setPatientData(patient);
        setSelectedPatient({
          id: patient.id, full_name: patient.full_name || patient.name, phone: patient.phone,
        });
        setForm(prev => ({ ...prev, patient_id: patient.id, last_medical_case: patient.last_medical_case || '' }));
      } catch { setError('Failed to load your profile.'); }
      finally  { setLoadingPatient(false); }
    };
    load();
  }, [role]);

  // ── Load dentists & services ──────────────────────────────────────────────
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
        setDentists(dentistRes.data.data ?? []);
        setServices((serviceRes.data.data ?? []).filter((s) => s.is_active !== false));
      } catch { setError('Failed to load required data.'); }
      finally  { setLoadingInit(false); }
    };
    load();
  }, [role, base]);

  // ── Fetch availability ────────────────────────────────────────────────────
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

        const res   = await apiClient.get(url, {
          params: { date: form.appointment_date, dentist_id: form.dentist_id, duration: form.duration_minutes },
        });
        if (cancelled) return;

        const avail = res.data.data;
        setAvailability(avail);

        if (prefillTime) {
          const dentistData  = avail?.dentists?.find((d) => String(d.id) === String(form.dentist_id));
          const windows = dentistData?.free_windows ?? [];
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
  }, [form.dentist_id, form.appointment_date, form.duration_minutes, role, base, prefillTime]);

  // ── Handlers ─────────────────────────────────────────────────────────────
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
    setForm(prev => ({ ...prev, patient_id: p.id, last_medical_case: p.last_medical_case ?? '' }));
  };

  const handlePatientClear = () => {
    setSelectedPatient(null);
    setForm(prev => ({ ...prev, patient_id: '', last_medical_case: '' }));
  };

  const handleServiceSelect = (serviceId) => {
    const svc = services.find((s) => String(s.id) === String(serviceId));
    setForm(prev => ({
      ...prev,
      service_type:     serviceId,
      service_name:     svc?.name ?? '',
      appointment_time: '',
      duration_minutes: svc?.duration_minutes ?? 30,
    }));
    setSelectedRange(null);
    setCustomTime('');
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
      setError(
        `Time must allow ${form.duration_minutes} min — between ${selectedRange.start} and ${selectedRange.end} (Ethiopian Time)`
      );
      setForm(p => ({ ...p, appointment_time: '' }));
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const dentistAvail   = availability?.dentists?.find((d) => String(d.id) === String(form.dentist_id));
  const morningHours   = dentistAvail?.working_hours?.morning;
  const afternoonHours = dentistAvail?.working_hours?.afternoon;
  const isClosed       = availability?.is_closed === true;

  const buildWindowsFromSlots = (slots, duration) => {
    if (!slots?.length) return [];
    const sorted = [...slots].sort((a, b) => toMinutes(a) - toMinutes(b));
    const windows = [];
    let winStart = sorted[0];
    let prev     = toMinutes(sorted[0]);

    for (let i = 1; i < sorted.length; i++) {
      const curr = toMinutes(sorted[i]);
      if (curr !== prev + duration) {
        windows.push({ start: winStart, end: String(Math.floor((prev + duration) / 60)).padStart(2,'0') + ':' + String((prev + duration) % 60).padStart(2,'0') });
        winStart = sorted[i];
      }
      prev = curr;
    }
    windows.push({
      start: winStart,
      end: `${String(Math.floor((prev + duration) / 60)).padStart(2,'0')}:${String((prev + duration) % 60).padStart(2,'0')}`,
    });
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

  const handleSave = async () => {
    setError('');
    if (!form.patient_id)       { setError('Please select a patient.'); return; }
    if (!form.dentist_id)       { setError('Please select a dentist.'); return; }
    if (!form.appointment_date) { setError('Please select a date.'); return; }
    if (!form.service_type)     { setError('Please select a service type.'); return; }
    if (!form.appointment_time) { setError('Please select an appointment time.'); return; }
    if (!isTimeValid && freeRanges.length > 0) {
      setError('Selected time does not fit within a free period.');
      return;
    }

    const appointmentDatetime = `${form.appointment_date} ${form.appointment_time}:00`;
    const selectedSvc         = services.find((s) => String(s.id) === String(form.service_type));
    const appointmentStatus   = (role === 'receptionist' || role === 'manager') ? 'confirmed' : 'pending';

    const selectedDentistObj  = dentists.find((d) => String(d.id) === String(form.dentist_id));
    const dentistIdForPayload = role === 'manager'
        ? Number(form.dentist_id)
        : (selectedDentistObj?.user_id ? Number(selectedDentistObj.user_id) : Number(form.dentist_id));

    const payload = {
        patient_id:       form.patient_id,
        dentist_id:       dentistIdForPayload,
        appointment_time: appointmentDatetime,
        duration_minutes: Number(form.duration_minutes),
        type:             selectedSvc?.name ?? 'Consultation',
        notes:            form.notes || form.last_medical_case || '',
        status:           appointmentStatus,
    };

    setSaving(true);
    try {
        const endpoint = role === 'patient'      ? '/patient/appointments'      :
                         role === 'manager'      ? '/manager/appointments'      :
                                                    '/receptionist/appointments';
        const res = await apiClient.post(endpoint, payload);
        onSaved(res.data.data, res.data.warnings ?? [], 'Appointment booked successfully.');
        onClose();
    } catch (err) {
        const response = err?.response?.data;
        
        if (response?.code === 'CARD_REQUIRED') {
            setError(response.message);
            if (window.confirm(`${response.message}\n\nWould you like to go to the billing page to complete the payment?`)) {
                window.location.href = role === 'manager' ? '/manager/billing' : '/receptionist/billing';
            }
        } else {
            setError(response?.message || 'Failed to book appointment.');
        }
    } finally {
        setSaving(false);
    }
  };

  const canSave = !saving && !isLoading && services.length > 0 && dentists.length > 0 && !isClosed && isTimeValid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isPatientRole ? 'Request Appointment' : 'New Appointment'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Patient → Service → Dentist → Date → Select free period → Set time
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
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
              {/* 1. Patient */}
              {isPatientRole ? (
                patientData && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          {patientData.full_name || patientData.name}
                        </p>
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

              {/* 2. Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {isPatientRole ? 'Reason for Visit' : 'Last Medical Case'}
                </label>
                <textarea
                  value={form.notes || form.last_medical_case || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={isPatientRole ? 'Describe your complaint...' : 'Add notes...'}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
                />
              </div>

              {/* 3. Service */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Service Type <span className="text-red-500">*</span>
                </label>
                {services.length === 0 ? (
                  <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                    No services available. Please contact clinic admin.
                  </div>
                ) : (
                  <select
                    value={form.service_type}
                    onChange={(e) => handleServiceSelect(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">Select service...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.duration_minutes} min{s.price ? ` · ETB ${s.price}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. Duration */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Duration <span className="text-gray-400 font-normal">(from service)</span>
                </label>
                <div className="flex items-center px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm">
                  <span className="font-bold text-blue-600 text-lg">{form.duration_minutes}</span>
                  <span className="ml-1 text-gray-400">minutes</span>
                </div>
              </div>

              {/* 5. Dentist */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Dentist <span className="text-red-500">*</span>
                </label>
                {dentists.length === 0 ? (
                  <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                    No dentists available at this branch.
                  </div>
                ) : (
                  <select
                    value={form.dentist_id}
                    onChange={handleDentistChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">Select dentist...</option>
                    {dentists.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name}
                        {d.specialization && d.specialization !== 'General Dentistry'
                          ? ` (${d.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 6. Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.appointment_date}
                  min={isPatientRole ? tomorrowDate() : todayDate()}
                  onChange={handleDateChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              {/* 7. Time */}
              {form.dentist_id && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Appointment Time <span className="text-red-500">*</span>
                  </label>

                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability...
                    </div>
                  ) : isClosed ? (
                    <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">
                        🏥 Clinic is closed for today (after 5:00 PM Ethiopian Time).
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Please select tomorrow or a future date.</p>
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
                              const isSelected = selectedRange?.start === range.start && selectedRange?.end === range.end;
                              return (
                                <button
                                  key={`${range.start}-${range.end}`}
                                  type="button"
                                  onClick={() => handleRangeSelect(range)}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {toEthiopianTime(range.start)} – {toEthiopianTime(range.end)}
                                  <span className={`font-normal text-[9px] ${isSelected ? 'text-blue-200' : 'text-green-500'}`}>
                                    ({range.start}–{range.end})
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {selectedRange && (
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                              <p className="text-xs font-semibold text-blue-700 mb-2">
                                Set exact start time within{' '}
                                <span className="font-bold">
                                  {toEthiopianTime(selectedRange.start)} – {toEthiopianTime(selectedRange.end)}
                                  <span className="font-normal text-blue-500"> ({selectedRange.start}–{selectedRange.end})</span>
                                </span>:
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
                                  ⚠ Must start ≥ {selectedRange.start} and end ≤ {selectedRange.end} EAT
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : !loadingSlots && form.dentist_id && form.appointment_date ? (
                        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                          <p className="text-xs text-amber-700 font-medium">No free slots for this dentist on the selected date.</p>
                          <p className="text-xs text-amber-500 mt-1">Try a different date or dentist.</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              {/* 8. Status info banner */}
              <div className={`px-4 py-3 rounded-xl border ${isPatientRole ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                {isPatientRole ? (
                  <p className="text-xs text-amber-700 font-semibold">
                    ℹ️ Your request will be reviewed. Status changes from <strong>Pending</strong> to <strong>Confirmed</strong> once approved.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-blue-700 font-semibold">
                      ℹ️ Appointment will be created with <strong>Confirmed</strong> status.
                    </p>
                    <p className="text-xs text-blue-500 mt-0.5">Patient can check in on arrival.</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
              isPatientRole ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {isPatientRole ? 'Submitting...' : 'Booking...'}</>
            ) : (
              <><Save className="w-4 h-4" /> {isPatientRole ? 'Request Appointment' : 'Book Appointment'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}