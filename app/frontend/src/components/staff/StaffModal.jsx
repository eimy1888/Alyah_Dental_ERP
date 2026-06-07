import { useState, useRef, useEffect } from 'react';
import { X, Upload, User } from 'lucide-react';

// IMPORTANT: Use lowercase values to match backend
const ROLES = [
  { label: 'Dentist', value: 'dentist' },
  { label: 'Receptionist', value: 'receptionist' },
  { label: 'Accountant', value: 'accountant' },
  { label: 'Branch Manager', value: 'branch_manager' },
  { label: 'Clinic Admin', value: 'clinic_admin' },
];

const roleBadge = {
  dentist:          'bg-blue-100 text-blue-700',
  receptionist:     'bg-green-100 text-green-700',
  accountant:       'bg-amber-100 text-amber-700',
  clinic_admin:     'bg-purple-100 text-purple-700',
  branch_manager:   'bg-teal-100 text-teal-700',
};

// Default working days: Monday to Saturday
const DEFAULT_WORKING_DAYS = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: false,
};

// Default working hours (Ethiopian time)
const DEFAULT_MORNING_START = '02:30';
const DEFAULT_MORNING_END = '06:00';
const DEFAULT_AFTERNOON_START = '07:30';
const DEFAULT_AFTERNOON_END = '11:00';

export default function StaffModal({
  member,          // null = add mode, object = edit mode
  branches,        // array of {id, name} — pass empty [] for branch manager
  fixedBranch,     // {id, name} — if set, branch selector is hidden and this is used
  onClose,
  onSave,          // async fn(formData: FormData) => void
}) {
  const isEdit   = !!member;
  const fileRef  = useRef(null);

  // ── Working Days State ───────────────────────────────────────
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS);

  // ── Working Hours State (Ethiopian Time) ─────────────────────
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningStart, setMorningStart] = useState(DEFAULT_MORNING_START);
  const [morningEnd, setMorningEnd] = useState(DEFAULT_MORNING_END);
  
  const [afternoonEnabled, setAfternoonEnabled] = useState(true);
  const [afternoonStart, setAfternoonStart] = useState(DEFAULT_AFTERNOON_START);
  const [afternoonEnd, setAfternoonEnd] = useState(DEFAULT_AFTERNOON_END);

  const [form, setForm] = useState({
    name:             member?.name             || '',
    email:            member?.email            || '',
    phone:            member?.phone            || '',
    role:             member?.role             || '',
    gender:           member?.gender           || '',
    branch_id:        fixedBranch?.id          || member?.branch_id || '',
    specialization:   member?.specialization   || '',
    working_days:     member?.working_days     || '',
    time_window:      member?.time_window      || '',
    bio:              member?.bio              || '',
    show_on_showcase: member?.show_on_showcase || false,
  });

  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(member?.photo_url || null);
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [apiError,     setApiError]     = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // ── Initialize from existing member data ─────────────────────
  useEffect(() => {
    if (member?.working_days) {
      const daysStr = member.working_days.toLowerCase();
      setWorkingDays({
        monday: daysStr.includes('mon'),
        tuesday: daysStr.includes('tue'),
        wednesday: daysStr.includes('wed'),
        thursday: daysStr.includes('thu'),
        friday: daysStr.includes('fri'),
        saturday: daysStr.includes('sat'),
        sunday: daysStr.includes('sun'),
      });
    }

    if (member?.time_window) {
      const parts = member.time_window.split(',');
      let morningFound = false;
      let afternoonFound = false;
      
      parts.forEach(part => {
        const match = part.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
        if (match) {
          const start = match[1];
          const end = match[2];
          const startHour = parseInt(start.split(':')[0]);
          if (startHour < 7 && !morningFound) {
            setMorningEnabled(true);
            setMorningStart(start);
            setMorningEnd(end);
            morningFound = true;
          } else if (!afternoonFound) {
            setAfternoonEnabled(true);
            setAfternoonStart(start);
            setAfternoonEnd(end);
            afternoonFound = true;
          }
        }
      });
    }
  }, [member]);

  // ── Generate working_days string from state ──────────────────
  const getWorkingDaysString = () => {
    const days = [];
    if (workingDays.monday) days.push('Mon');
    if (workingDays.tuesday) days.push('Tue');
    if (workingDays.wednesday) days.push('Wed');
    if (workingDays.thursday) days.push('Thu');
    if (workingDays.friday) days.push('Fri');
    if (workingDays.saturday) days.push('Sat');
    if (workingDays.sunday) days.push('Sun');
    return days.join(', ');
  };

  // ── Generate time_window string from state ───────────────────
  const getTimeWindowString = () => {
    const parts = [];
    if (morningEnabled) {
      parts.push(`${morningStart}-${morningEnd}`);
    }
    if (afternoonEnabled) {
      parts.push(`${afternoonStart}-${afternoonEnd}`);
    }
    return parts.join(', ');
  };

  // ── Update form when working days/hours change ───────────────
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      working_days: getWorkingDaysString(),
      time_window: getTimeWindowString(),
    }));
  }, [workingDays, morningEnabled, morningStart, morningEnd, afternoonEnabled, afternoonStart, afternoonEnd]);

  const setDefaultWorkingDays = () => {
    setWorkingDays(DEFAULT_WORKING_DAYS);
  };

  const setDefaultWorkingHours = () => {
    setMorningEnabled(true);
    setMorningStart(DEFAULT_MORNING_START);
    setMorningEnd(DEFAULT_MORNING_END);
    setAfternoonEnabled(true);
    setAfternoonStart(DEFAULT_AFTERNOON_START);
    setAfternoonEnd(DEFAULT_AFTERNOON_END);
  };

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.role)         e.role = 'Role is required';
    
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      e.email = 'Valid email is required';
    }
    
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    setApiError('');
    setTempPassword('');

    try {
      const fd = new FormData();

      if (isEdit) fd.append('_method', 'PUT');

      Object.entries(form).forEach(([k, v]) => {
        if (k === 'show_on_showcase') {
          fd.append(k, v ? '1' : '0');
        } else if (v !== null && v !== undefined && v !== '') {
          fd.append(k, v);
        }
      });

      if (photoFile) {
        fd.append('photo', photoFile);
      }

      const response = await onSave(fd, isEdit ? member.id : null);
      
      if (!isEdit && response?.data?.temp_password) {
        setTempPassword(response.data.temp_password);
        return;
      }
      
      onClose();
    } catch (err) {
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err?.response?.data?.message) {
        setApiError(err.response.data.message);
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const initials = form.name
    ? form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">
              Staff Management
            </p>
            <h2 className="text-white text-xl font-bold mt-0.5">
              {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Temp Password Display for New Staff */}
          {tempPassword && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm font-semibold text-green-800 mb-1">Staff member created successfully!</p>
              <p className="text-xs text-green-700 mb-2">
                Temporary password for <strong>{form.email}</strong>:
              </p>
              <code className="block bg-white px-3 py-2 rounded-lg text-sm font-mono text-green-700 border border-green-200">
                {tempPassword}
              </code>
              <button
                onClick={onClose}
                className="mt-3 w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
              >
                Close
              </button>
            </div>
          )}

          {!tempPassword && (
            <>
              {apiError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0 border-2 border-blue-200">
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-700 font-bold text-lg">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG · max 2MB</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Dr. Sara Girma"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="staff@clinic.com"
                  type="email"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+251 9X XXX XXXX"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              {/* Role + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.role}
                    onChange={e => set('role', e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                      errors.role ? 'border-red-400' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Select role</option>
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => set('gender', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Branch - hidden if fixedBranch is set */}
              {!fixedBranch && branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Branch
                  </label>
                  <select
                    value={form.branch_id}
                    onChange={e => set('branch_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fixed branch display */}
              {fixedBranch && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Branch
                  </label>
                  <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-600 font-medium">
                    {fixedBranch.name}
                  </div>
                </div>
              )}

              {/* Specialization */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Specialization
                </label>
                <input
                  value={form.specialization}
                  onChange={e => set('specialization', e.target.value)}
                  placeholder="e.g. Orthodontist, Oral Surgeon"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* ── WORKING DAYS SECTION (Ethiopian Calendar) ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Working Days (Ethiopian Calendar)
                </label>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'monday', label: 'Mon' },
                      { key: 'tuesday', label: 'Tue' },
                      { key: 'wednesday', label: 'Wed' },
                      { key: 'thursday', label: 'Thu' },
                      { key: 'friday', label: 'Fri' },
                      { key: 'saturday', label: 'Sat' },
                      { key: 'sunday', label: 'Sun' },
                    ].map((day) => (
                      <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={workingDays[day.key]}
                          onChange={(e) => setWorkingDays(prev => ({ ...prev, [day.key]: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={setDefaultWorkingDays}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Set Default (Mon-Sat)
                  </button>
                </div>
              </div>

              {/* ── WORKING HOURS SECTION (Ethiopian Time) ────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Working Hours (Ethiopian Time - UTC+3)
                </label>
                <div className="space-y-4">
                  
                  {/* Morning Session */}
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={morningEnabled}
                        onChange={(e) => setMorningEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Morning Session</span>
                      <span className="text-xs text-gray-400">(2:30 AM - 6:00 AM ET)</span>
                    </label>
                    {morningEnabled && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={morningStart}
                            onChange={(e) => setMorningStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">End Time</label>
                          <input
                            type="time"
                            value={morningEnd}
                            onChange={(e) => setMorningEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Afternoon Session */}
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={afternoonEnabled}
                        onChange={(e) => setAfternoonEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Afternoon Session</span>
                      <span className="text-xs text-gray-400">(7:30 AM - 11:00 AM ET)</span>
                    </label>
                    {afternoonEnabled && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={afternoonStart}
                            onChange={(e) => setAfternoonStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">End Time</label>
                          <input
                            type="time"
                            value={afternoonEnd}
                            onChange={(e) => setAfternoonEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={setDefaultWorkingHours}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Reset to Default (Morning: 2:30-6:00, Afternoon: 7:30-11:00)
                  </button>
                  
                  <p className="text-xs text-gray-400 mt-1">
                    ⏰ Ethiopian Time (UTC+3) — These times are displayed in 24-hour format
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => set('bio', e.target.value)}
                  rows={3}
                  placeholder="Professional background, education, experience..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Show on showcase */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => set('show_on_showcase', !form.show_on_showcase)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    form.show_on_showcase ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.show_on_showcase ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  Show on public clinic showcase
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}