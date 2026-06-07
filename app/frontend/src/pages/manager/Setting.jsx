import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Settings, User, Lock, Bell } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';

const TABS = [
  { key: 'profile',       label: 'Profile',       icon: User },
  { key: 'security',      label: 'Security',       icon: Lock },
  { key: 'notifications', label: 'Notifications',  icon: Bell },
];

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? 'translate-x-4' : 'translate-x-1'
      }`} />
    </button>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 ml-4">{children}</div>
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error:   'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${styles[type]}`}>
      {msg}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, setAuth } = useAuthStore();
  const [form, setForm]   = useState({
    name:  user?.name  ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiClient.put('/manager/settings/profile', form);
      if (res.data.success) {
        setSaved(true);
        setStatus({ type: 'success', msg: 'Profile updated successfully.' });
        // Update auth store with new name/email
        setAuth({ ...user, ...form }, useAuthStore.getState().token);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setStatus({ type: 'error', msg: res.data.message ?? 'Update failed.' });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.errors
          ? Object.values(err.response.data.errors)[0]?.[0]
          : err?.response?.data?.message ?? 'Update failed.';
      setStatus({ type: 'error', msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SectionCard
        title="Personal Information"
        description="Update your name, email, and phone number."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Full name', key: 'name',  type: 'text',  placeholder: 'Samuel Tesfaye' },
            { label: 'Email',     key: 'email', type: 'email', placeholder: 'samuel@clinic.et' },
            { label: 'Phone',     key: 'phone', type: 'text',  placeholder: '+251 9XX XXX XXX' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className={key === 'phone' ? 'md:col-span-2 max-w-xs' : ''}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Branch info — read only */}
      <SectionCard
        title="Branch Information"
        description="Your branch assignment — managed by Clinic Admin."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Branch name', value: user?.branch?.name ?? '—' },
            { label: 'Location',    value: user?.branch?.location ?? '—' },
            { label: 'Clinic',      value: user?.clinic?.name ?? '—' },
            { label: 'Role',        value: 'Branch Manager' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                {value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex items-center justify-between gap-4">
        <StatusMsg type={status?.type} msg={status?.msg} />
        <div className="ml-auto">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
              saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save changes'}</>
            }
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [passwords, setPasswords] = useState({
    current_password:      '',
    password:              '',
    password_confirmation: '',
  });
  const [show,   setShow]   = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [status, setStatus] = useState(null);

  const fields = [
    { label: 'Current password', key: 'current_password',      showKey: 'current' },
    { label: 'New password',     key: 'password',               showKey: 'new' },
    { label: 'Confirm password', key: 'password_confirmation',  showKey: 'confirm' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (passwords.password !== passwords.password_confirmation) {
      setStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    if (passwords.password.length < 8) {
      setStatus({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.put('/manager/settings/password', passwords);
      if (res.data.success) {
        setSaved(true);
        setStatus({ type: 'success', msg: 'Password updated successfully.' });
        setPasswords({ current_password: '', password: '', password_confirmation: '' });
        setTimeout(() => setSaved(false), 2500);
      } else {
        setStatus({ type: 'error', msg: res.data.message ?? 'Update failed.' });
      }
    } catch (err) {
      const errData = err?.response?.data;
      const msg =
        errData?.errors?.current_password?.[0] ??
        errData?.errors?.password?.[0] ??
        errData?.message ??
        'Password update failed.';
      setStatus({ type: 'error', msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SectionCard
        title="Change Password"
        description="Update your account password."
      >
        <div className="space-y-4 max-w-md">
          {fields.map(({ label, key, showKey }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  value={passwords[key]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-blue-400 pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShow((p) => ({ ...p, [showKey]: !p[showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex items-center justify-between gap-4">
        <StatusMsg type={status?.type} msg={status?.msg} />
        <div className="ml-auto">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
              saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> {saved ? 'Updated!' : 'Update password'}</>
            }
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const [toggles, setToggles] = useState({
    new_appointment:   true,
    appointment_cancel: true,
    low_stock:         true,
    daily_summary:     false,
    patient_registered: true,
  });
  const [saved, setSaved] = useState(false);

  const rows = [
    { key: 'new_appointment',    label: 'New appointment',       description: 'Notify when a new appointment is booked.' },
    { key: 'appointment_cancel', label: 'Appointment cancelled', description: 'Notify when an appointment is cancelled.' },
    { key: 'low_stock',          label: 'Low stock alert',       description: 'Notify when an inventory item falls below threshold.' },
    { key: 'patient_registered', label: 'New patient',          description: 'Notify when a new patient is registered.' },
    { key: 'daily_summary',      label: 'Daily summary',        description: 'Receive a daily summary of branch activity.' },
  ];

  const handleSave = () => {
    // TODO: wire to PUT /manager/settings/notifications
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Notification Preferences"
        description="Choose which events send you notifications."
      >
        {rows.map(({ key, label, description }) => (
          <SettingRow key={key} label={label} description={description}>
            <Toggle
              enabled={toggles[key]}
              onChange={(v) => setToggles((p) => ({ ...p, [key]: v }))}
            />
          </SettingRow>
        ))}
      </SectionCard>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────────
export default function ManagerSettings() {
  const [activeTab, setActiveTab] = useState('profile');

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':       return <ProfileTab />;
      case 'security':      return <SecurityTab />;
      case 'notifications': return <NotificationsTab />;
      default:              return <ProfileTab />;
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Branch Manager
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your profile, password, and notification preferences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {renderTab()}
    </div>
  );
}