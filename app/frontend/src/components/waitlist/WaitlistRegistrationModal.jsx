import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Search, AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

function PatientSearchField({ role, onSelect, selectedPatient, onClear }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const base = role === 'manager' ? '/manager' : '/receptionist';
        const res = await apiClient.get(`${base}/patients`, {
          params: { search: query, per_page: 8 },
        });
        setResults(res.data.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, role]);

  const handleSelect = (p) => {
    onSelect(p);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

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
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search registered patient by name or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {open && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {p.phone}
                    {p.gender ? ` · ${p.gender}` : ''}
                    {p.age ? ` · ${p.age} yrs` : ''}
                  </p>
                  {p.last_medical_case && (
                    <p className="text-xs text-blue-500 mt-0.5 truncate">
                      Last case: {p.last_medical_case}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {open && results.length === 0 && query.length >= 2 && !searching && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-400">
              No registered patients found. You can still enter details manually below.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WaitlistRegistrationModal({
  role = 'receptionist',
  onClose,
  onSaved,
}) {
  const base = role === 'manager' ? '/manager' : '/receptionist';

  const [selectedPatient,  setSelectedPatient]  = useState(null);
  const [priority,         setPriority]         = useState('normal');
  const [name,             setName]             = useState('');
  const [phone,            setPhone]            = useState('');
  const [currentMedCase,   setCurrentMedCase]   = useState('');
  const [lastMedCase,      setLastMedCase]      = useState('');
  const [dentists,         setDentists]         = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [services,         setServices]         = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [slotAvailable, setSlotAvailable] = useState(null);
  const [estimatedEndTime, setEstimatedEndTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  // Load dentists and services with better error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        
        // Fetch dentists based on role
        let dentistEndpoint;
        if (role === 'manager') {
          dentistEndpoint = '/manager/dentists';
        } else {
          dentistEndpoint = '/receptionist/appointments/dentists';
        }
        
        // Fetch services
        const servicesEndpoint = `${base}/services`;
        
        console.log('Fetching dentists from:', dentistEndpoint);
        console.log('Fetching services from:', servicesEndpoint);
        
        const [dentistRes, serviceRes] = await Promise.all([
          apiClient.get(dentistEndpoint),
          apiClient.get(servicesEndpoint),
        ]);
        
        console.log('Dentists response:', dentistRes.data);
        console.log('Services response:', serviceRes.data);
        
        const dentistsData = dentistRes.data.data ?? [];
        const servicesData = serviceRes.data.data ?? [];
        
        console.log('Dentists count:', dentistsData.length);
        console.log('Services count:', servicesData.length);
        
        setDentists(dentistsData);
        setServices(servicesData);
        
        if (dentistsData.length === 0) {
          setLoadError('No dentists found. Please add dentists to this branch.');
        }
        if (servicesData.length === 0) {
          setLoadError(prev => prev ? `${prev} No services found.` : 'No services found. Please add services in clinic settings.');
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load dentists and services';
        setLoadError(errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [base, role]);

  // Check availability when dentist and service are selected
  useEffect(() => {
    if (!selectedDentistId || !selectedServiceId) {
      setSlotAvailable(null);
      setEstimatedEndTime(null);
      return;
    }

    const checkSlot = async () => {
      setCheckingAvailability(true);
      try {
        const service = services.find(s => s.id === parseInt(selectedServiceId));
        const duration = service?.duration_minutes || 30;
        
        const now = new Date();
        const res = await apiClient.get(`${base}/appointments/availability`, {
          params: { 
            date: now.toISOString().slice(0, 10), 
            dentist_id: selectedDentistId,
            duration: duration 
          },
        });
        
        const dentistData = res.data.data?.dentists?.find(d => d.id === parseInt(selectedDentistId));
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        let foundSlot = false;
        let slotStartTime = null;
        
        if (dentistData?.free_slots) {
          for (const slot of dentistData.free_slots) {
            const [slotHour, slotMin] = slot.split(':').map(Number);
            const slotMinutes = slotHour * 60 + slotMin;
            
            if (slotMinutes >= currentTime) {
              const slotEndMinutes = slotMinutes + duration;
              
              let withinHours = true;
              if (dentistData.working_hours) {
                const morningEnd = dentistData.working_hours.morning?.end;
                const afternoonStart = dentistData.working_hours.afternoon?.start;
                
                if (morningEnd && afternoonStart) {
                  const [morningEndHour, morningEndMin] = morningEnd.split(':').map(Number);
                  const [afternoonStartHour, afternoonStartMin] = afternoonStart.split(':').map(Number);
                  const morningEndMinutes = morningEndHour * 60 + morningEndMin;
                  const afternoonStartMinutes = afternoonStartHour * 60 + afternoonStartMin;
                  
                  if (slotMinutes < morningEndMinutes && slotEndMinutes > morningEndMinutes) {
                    withinHours = false;
                  }
                  if (slotMinutes >= afternoonStartMinutes && slotEndMinutes > afternoonStartMinutes + 60) {
                    withinHours = false;
                  }
                }
              }
              
              if (withinHours) {
                foundSlot = true;
                slotStartTime = slot;
                const endDate = new Date(now);
                endDate.setHours(slotHour, slotMin + duration, 0, 0);
                setEstimatedEndTime(endDate);
                break;
              }
            }
          }
        }
        
        setSlotAvailable(foundSlot);
      } catch (err) {
        console.error('Availability check failed:', err);
        setSlotAvailable(false);
      } finally {
        setCheckingAvailability(false);
      }
    };
    
    checkSlot();
  }, [selectedDentistId, selectedServiceId, base, services]);

  const handlePatientSelect = (p) => {
    setSelectedPatient(p);
    setName(p.full_name || '');
    setPhone(p.phone || '');
    setLastMedCase(p.last_medical_case || '');
  };

  const handlePatientClear = () => {
    setSelectedPatient(null);
    setName('');
    setPhone('');
    setLastMedCase('');
    setCurrentMedCase('');
  };

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError('Patient name is required.');
      return;
    }

    if (!selectedDentistId) {
      setError('Please select a dentist.');
      return;
    }

    if (!selectedServiceId) {
      setError('Please select a service type.');
      return;
    }

    const payload = {
      patient_id: selectedPatient?.id ?? null,
      name: name.trim(),
      phone: phone.trim() || null,
      current_medical_case: currentMedCase.trim() || null,
      priority,
      dentist_id: parseInt(selectedDentistId),
      service_id: parseInt(selectedServiceId),
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

  const selectedService = services.find(s => s.id === parseInt(selectedServiceId));
  const selectedDentist = dentists.find(d => d.id === parseInt(selectedDentistId));
  const patientGender = selectedPatient?.gender ?? null;
  const patientAge = selectedPatient?.age ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add to Waitlist</h2>
            <p className="text-xs text-gray-400 mt-0.5">Walk-in or registered patient</p>
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

          {loadError && !loading && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
              ⚠️ {loadError}
            </div>
          )}

          {/* Priority Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  priority === 'normal'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  priority === 'urgent'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Urgent
              </button>
            </div>
            {priority === 'urgent' && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Patient will be placed at the top of the queue if slot available.
              </p>
            )}
          </div>

          {/* Patient Search */}
          <PatientSearchField
            role={role}
            onSelect={handlePatientSelect}
            selectedPatient={selectedPatient}
            onClear={handlePatientClear}
          />

          {/* Name (auto-filled or manual) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patient full name"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+251 9xx xxx xxx"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Gender + Age (read-only, from patient record) */}
          {selectedPatient && (patientGender || patientAge) && (
            <div className="grid grid-cols-2 gap-3">
              {patientGender && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gender</label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600 capitalize">
                    {patientGender}
                  </div>
                </div>
              )}
              {patientAge && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Age</label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600">
                    {patientAge} years
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Medical Case */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Last Medical Case
              <span className="ml-1 text-gray-400 font-normal">(from patient history)</span>
            </label>
            <div className={`px-4 py-2.5 rounded-xl border text-sm min-h-[42px] ${
              lastMedCase
                ? 'border-blue-100 bg-blue-50 text-blue-800'
                : 'border-gray-100 bg-gray-50 text-gray-400 italic'
            }`}>
              {lastMedCase || 'No previous case on record'}
            </div>
          </div>

          {/* Current Medical Case */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Current Medical Case
              <span className="ml-1 text-gray-400 font-normal">(reason for today's visit)</span>
            </label>
            <textarea
              value={currentMedCase}
              onChange={(e) => setCurrentMedCase(e.target.value)}
              placeholder="Describe the current complaint or reason for visit..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
            />
          </div>

          {/* Dentist Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Assign Dentist <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-xs text-gray-400">Loading dentists...</p>
              </div>
            ) : dentists.length === 0 ? (
              <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                No dentists available. Please add dentists to this branch.
              </div>
            ) : (
              <select
                value={selectedDentistId}
                onChange={(e) => {
                  setSelectedDentistId(e.target.value);
                  setSlotAvailable(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
              >
                <option value="">Select dentist...</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.specialization ? `(${d.specialization})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Service Type <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-xs text-gray-400">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
                No services available. Please add services in clinic settings.
              </div>
            ) : (
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setSlotAvailable(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
              >
                <option value="">Select service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes} min) - ETB {s.price}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Availability Status */}
          {selectedDentistId && selectedServiceId && (
            <div className={`p-4 rounded-xl border ${
              slotAvailable === true
                ? 'bg-green-50 border-green-200'
                : slotAvailable === false
                ? 'bg-amber-50 border-amber-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking availability...
                </div>
              ) : slotAvailable === true ? (
                <div>
                  <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Slot Available!
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Estimated duration: {selectedService?.duration_minutes} minutes
                    {estimatedEndTime && (
                      <span> · Ready by: {estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Patient will enter live queue {priority === 'urgent' ? 'at the TOP' : 'at the BOTTOM'} immediately.
                  </p>
                </div>
              ) : slotAvailable === false ? (
                <div>
                  <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold">
                    <Clock className="w-4 h-4" /> No Slot Available
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    No free slot found for this dentist at current time.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Patient will be added to waitlist. Dentist will be notified when slot becomes available.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Medical history (if patient has multiple cases) */}
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
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || dentists.length === 0 || services.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
              priority === 'urgent'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
              : <><Save className="w-4 h-4" /> Add to Waitlist</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}