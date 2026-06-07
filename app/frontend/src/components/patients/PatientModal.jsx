import { useState } from 'react';
import { X } from 'lucide-react';

// ── Moved outside component — fixes focus-loss bug ────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
    err ? 'border-red-400 bg-red-50' : 'border-gray-200'
  }`;

// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  first_name:         '',
  last_name:          '',
  phone:              '',
  email:              '',
  date_of_birth:      '',
  gender:             '',
  city:               '',
  address:            '',
  insurance_provider: '',
  insurance_number:   '',
  current_case:       '',
  medical_history:    '',
  other_conditions:   '',
};

export default function PatientModal({
  patient,
  fixedBranch,
  onClose,
  onSave,
}) {
  const isEdit = !!patient;
  const branch = fixedBranch || (patient?.branch ?? null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...(patient ? {
      first_name:         patient.first_name         || '',
      last_name:          patient.last_name           || '',
      phone:              patient.phone               || '',
      email:              patient.email               || '',
      date_of_birth:      patient.date_of_birth       || '',
      gender:             patient.gender              || '',
      city:               patient.city                || '',
      address:            patient.address             || '',
      insurance_provider: patient.insurance_provider  || '',
      insurance_number:   patient.insurance_number    || '',
      current_case:       patient.current_case        || '',
      medical_history:    patient.medical_history     || '',
      other_conditions:   patient.other_conditions    || '',
    } : {}),
  });

  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim())  e.last_name  = 'Last name is required';
    if (!form.phone.trim())      e.phone      = 'Phone is required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setApiError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">
              Patient Registry
            </p>
            <h2 className="text-white text-xl font-bold mt-0.5">
              {isEdit ? 'Edit Patient' : 'Register New Patient'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {apiError}
            </div>
          )}

          {/* ── SECTION 1: Personal Information ── */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-3">
              Personal Information
            </h3>
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required error={errors.first_name}>
                  <input
                    value={form.first_name}
                    onChange={e => set('first_name', e.target.value)}
                    placeholder="Mikiyas"
                    className={inputCls(errors.first_name)}
                  />
                </Field>
                <Field label="Last Name" required error={errors.last_name}>
                  <input
                    value={form.last_name}
                    onChange={e => set('last_name', e.target.value)}
                    placeholder="Haile"
                    className={inputCls(errors.last_name)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone" required error={errors.phone}>
                  <input
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+251 9XX XXX XXX"
                    className={inputCls(errors.phone)}
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="patient@email.com"
                    type="email"
                    className={inputCls(false)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth">
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Gender">
                  <select
                    value={form.gender}
                    onChange={e => set('gender', e.target.value)}
                    className={inputCls(false)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="Addis Ababa"
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Address">
                  <input
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Bole Road, Addis Ababa"
                    className={inputCls(false)}
                  />
                </Field>
              </div>

            </div>
          </div>

          {/* ── SECTION 2: Branch (fixed, read-only) ── */}
          {branch && (
            <div>
              <h3 className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-3">
                Branch
              </h3>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 font-medium">
                {branch.name}
              </div>
            </div>
          )}

          {/* ── SECTION 3: Insurance ── */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-3">
              Insurance{' '}
              <span className="text-gray-400 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Insurance Provider">
                <input
                  value={form.insurance_provider}
                  onChange={e => set('insurance_provider', e.target.value)}
                  placeholder="Nib Insurance / Private Pay"
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Insurance Number">
                <input
                  value={form.insurance_number}
                  onChange={e => set('insurance_number', e.target.value)}
                  placeholder="INS-0000-0000"
                  className={inputCls(false)}
                />
              </Field>
            </div>
          </div>

          {/* ── SECTION 4: Medical Records ── */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-3">
              Medical Records{' '}
              <span className="text-gray-400 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </h3>
            <div className="space-y-4">

              <Field label="Current Case">
                <textarea
                  value={form.current_case}
                  onChange={e => set('current_case', e.target.value)}
                  rows={3}
                  placeholder="What is the patient currently being treated for? Chief complaint, current symptoms..."
                  className={inputCls(false) + ' resize-none'}
                />
              </Field>

              <Field label="Previous Medical History">
                <textarea
                  value={form.medical_history}
                  onChange={e => set('medical_history', e.target.value)}
                  rows={3}
                  placeholder="Previous diagnoses, surgeries, hospitalizations, past dental treatments..."
                  className={inputCls(false) + ' resize-none'}
                />
              </Field>

              <Field label="Other Conditions">
                <textarea
                  value={form.other_conditions}
                  onChange={e => set('other_conditions', e.target.value)}
                  rows={2}
                  placeholder="Chronic conditions, allergies, medications, disabilities..."
                  className={inputCls(false) + ' resize-none'}
                />
              </Field>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Patient'}
          </button>
        </div>

      </div>
    </div>
  );
}