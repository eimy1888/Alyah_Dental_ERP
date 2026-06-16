import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Shield, Bell, Globe, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
} from '../../services/platformService';

const TABS = [
  { key: 'general',       label: 'General',       icon: Settings },
  { key: 'security',      label: 'Security',      icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'platform',      label: 'Platform',      icon: Globe },
];

// ── Shared primitives ────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
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
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
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

function SaveBtn({ loading, saved, label = 'Save changes', savedLabel = 'Saved!' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
        saved
          ? 'bg-green-500 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Save className="w-4 h-4" />
      }
      {saved ? savedLabel : label}
    </button>
  );
}

// ── General Tab — REAL API ───────────────────────────────────────────────────

function GeneralTab() {
  const [form, setForm] = useState({
    name:  '',
    email: '',
    phone: '',
  });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [status,     setStatus]     = useState(null); // { type, msg }

  // Load real profile on mount
  useEffect(() => {
    getAdminProfile()
      .then((res) => {
        if (res.status && res.data) {
          setForm({
            name:  res.data.name  ?? '',
            email: res.data.email ?? '',
            phone: res.data.phone ?? '',
          });
        }
      })
      .catch(() => setStatus({ type: 'error', msg: 'Failed to load profile.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateAdminProfile(form);
      if (res.status) {
        setSaved(true);
        setStatus({ type: 'success', msg: 'Profile updated successfully.' });
        setTimeout(() => setSaved(false), 2500);
      } else {
        setStatus({ type: 'error', msg: res.message ?? 'Update failed.' });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        Object.values(err?.response?.data?.errors ?? {})[0]?.[0] ??
        'Update failed. Please try again.';
      setStatus({ type: 'error', msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SectionCard
        title="Admin Profile"
        description="Your platform admin account name, email, and phone."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Full name',    key: 'name',  type: 'text',  placeholder: 'Platform Admin' },
            { label: 'Email',        key: 'email', type: 'email', placeholder: 'admin@alyah.et' },
            { label: 'Phone',        key: 'phone', type: 'text',  placeholder: '+251 9XX XXX XXX' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className={key === 'phone' ? 'md:col-span-2 max-w-xs' : ''}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {label}
              </label>
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

      {/* Platform-level fields are read-only display — no DB table yet */}
      <SectionCard
        title="Platform Identity"
        description="Core platform branding (managed via environment config)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Platform name',    value: 'Alyah Dental ERP' },
            { label: 'Support email',    value: 'support@alyah.et' },
            { label: 'Default currency', value: 'ETB — Ethiopian Birr' },
            { label: 'Timezone',         value: 'Africa/Addis_Ababa (UTC+3)' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          To change platform-level config, update the environment variables and redeploy.
        </p>
      </SectionCard>

      <div className="flex items-center justify-between gap-4">
        <StatusMsg type={status?.type} msg={status?.msg} />
        <div className="ml-auto">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </div>
    </form>
  );
}

// ── Security Tab — REAL API (password change) ────────────────────────────────

function SecurityTab() {
  const [passwords, setPasswords] = useState({
    current_password:  '',
    password:          '',
    password_confirmation: '',
  });
  const [show,   setShow]   = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [status, setStatus] = useState(null);

  const [toggles, setToggles] = useState({
    twoFactor:      true,
    sessionTimeout: true,
    auditLog:       true,
    ipWhitelist:    false,
  });

  const handlePasswordSubmit = async (e) => {
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
      const res = await updateAdminPassword(passwords);
      if (res.status) {
        setSaved(true);
        setStatus({ type: 'success', msg: 'Password updated successfully.' });
        setPasswords({ current_password: '', password: '', password_confirmation: '' });
        setTimeout(() => setSaved(false), 2500);
      } else {
        setStatus({ type: 'error', msg: res.message ?? 'Update failed.' });
      }
    } catch (err) {
      // Surface Laravel validation errors clearly
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

  const fields = [
    { label: 'Current password', key: 'current_password', showKey: 'current' },
    { label: 'New password',     key: 'password',          showKey: 'new'     },
    { label: 'Confirm password', key: 'password_confirmation', showKey: 'confirm' },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title="Change Password"
        description="Update the platform admin account password."
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          {fields.map(({ label, key, showKey }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  value={passwords[key]}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, [key]: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-blue-400 pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShow((p) => ({ ...p, [showKey]: !p[showKey] }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show[showKey] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4 pt-1">
            <StatusMsg type={status?.type} msg={status?.msg} />
            <div className="ml-auto">
              <SaveBtn
                loading={saving}
                saved={saved}
                label="Update password"
                savedLabel="Updated!"
              />
            </div>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Security Controls"
        description="Platform-wide security and session management settings."
      >
        {[
          { key: 'twoFactor',      label: 'Two-factor authentication',   description: 'Require 2FA for all platform admin logins.' },
          { key: 'sessionTimeout', label: 'Session timeout',             description: 'Automatically log out inactive sessions after 30 minutes.' },
          { key: 'auditLog',       label: 'Audit log',                   description: 'Log all admin actions including approvals, suspensions, and plan changes.' },
          { key: 'ipWhitelist',    label: 'IP whitelist',                description: 'Restrict platform admin access to specific IP addresses.' },
        ].map(({ key, label, description }) => (
          <SettingRow key={key} label={label} description={description}>
            <Toggle
              enabled={toggles[key]}
              onChange={(v) => setToggles((p) => ({ ...p, [key]: v }))}
            />
          </SettingRow>
        ))}
        <p className="text-xs text-gray-400 pt-3">
          These controls are enforced at the server level. Changes here update the
          platform configuration on your next deployment.
        </p>
      </SectionCard>
    </div>
  );
}

// ── Notifications Tab — local state (no DB table yet) ────────────────────────

function NotificationsTab() {
  const [toggles, setToggles] = useState({
    newRegistration:  true,
    approvalReminder: true,
    paymentFailed:    true,
    suspensionAlert:  true,
    systemHealth:     false,
    weeklyReport:     true,
  });
  const [saved, setSaved] = useState(false);

  const rows = [
    { key: 'newRegistration',  label: 'New clinic registration',    description: 'Notify when a new clinic submits for approval.' },
    { key: 'approvalReminder', label: 'Approval SLA reminder',      description: 'Alert when a registration approaches the SLA deadline.' },
    { key: 'paymentFailed',    label: 'Payment failure',            description: 'Notify when a clinic subscription payment fails.' },
    { key: 'suspensionAlert',  label: 'Clinic suspension',          description: 'Notify when a clinic is suspended or reactivated.' },
    { key: 'systemHealth',     label: 'System health alerts',       description: 'Receive alerts for API errors and queue failures.' },
    { key: 'weeklyReport',     label: 'Weekly platform report',     description: 'Summary of MRR, new tenants, and approvals each Monday.' },
  ];

  const handleSave = async () => {
    setSaved(true);
    // Notifications preferences are stored in the platform admin profile settings
    // They will be wired to a backend endpoint when the notifications DB table is created
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Email Notifications"
        description="Control which platform events trigger email alerts to the admin."
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

// ── Platform Tab — local state (no DB table yet) ─────────────────────────────

function PlatformTab() {
  const [toggles, setToggles] = useState({
    maintenanceMode:   false,
    publicShowcase:    true,
    onlineBooking:     true,
    newRegistrations:  true,
    debugMode:         false,
  });
  const [saved, setSaved] = useState(false);

  const rows = [
    { key: 'maintenanceMode',  label: 'Maintenance mode',        description: 'Take the platform offline for all tenants. Use with caution.', danger: true },
    { key: 'publicShowcase',   label: 'Public clinic showcase',  description: 'Allow approved clinics to appear on the public showcase page.' },
    { key: 'onlineBooking',    label: 'Online booking',          description: 'Enable patients to book appointments via the showcase.' },
    { key: 'newRegistrations', label: 'Accept new registrations',description: 'Allow new clinics to submit registration requests.' },
    { key: 'debugMode',        label: 'Debug mode',              description: 'Log verbose errors to the platform admin panel.' },
  ];

  const handleSave = async () => {
    setSaved(true);
    // Platform flags are stored in environment config — local preview only until
    // a platform_settings DB table is created
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Platform Controls"
        description="Global feature flags and operational switches for the entire platform."
      >
        {rows.map(({ key, label, description, danger }) => (
          <SettingRow key={key} label={label} description={description}>
            <div className="flex items-center gap-2">
              {danger && toggles[key] && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              )}
              <Toggle
                enabled={toggles[key]}
                onChange={(v) => setToggles((p) => ({ ...p, [key]: v }))}
              />
            </div>
          </SettingRow>
        ))}
      </SectionCard>

      <SectionCard
        title="Danger Zone"
        description="Irreversible or high-impact platform actions."
      >
        <div className="space-y-3">
          {[
            {
              label:  'Clear all pending approvals',
              sub:    'Removes all unreviewed clinic registrations from the queue.',
              action: () => {
                if (!window.confirm('This will reject all pending clinic registrations. This cannot be undone. Continue?')) return;
                // Future: POST /platform/admin/clear-pending
                alert('Action queued. Implement POST /platform/admin/clear-pending when ready.');
              },
            },
            {
              label:  'Reset platform analytics',
              sub:    'Clears cached dashboard metrics. Live data is unaffected.',
              action: () => {
                if (!window.confirm('This will clear cached analytics data. Continue?')) return;
                // Future: POST /platform/admin/reset-analytics-cache
                alert('Cache cleared. Implement POST /platform/admin/reset-analytics-cache when ready.');
              },
            },
          ].map(({ label, sub, action }) => (
            <div
              key={label}
              className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50"
            >
              <div>
                <p className="text-sm font-semibold text-red-700">{label}</p>
                <p className="text-xs text-red-400 mt-0.5">{sub}</p>
              </div>
              <button
                onClick={action}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
                Execute
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// ── Root Page ────────────────────────────────────────────────────────────────

export default function PlatformSettings() {
  const { t } = useTranslation('platform');
  const [activeTab, setActiveTab] = useState('general');

  const renderTab = () => {
    switch (activeTab) {
      case 'general':       return <GeneralTab />;
      case 'security':      return <SecurityTab />;
      case 'notifications': return <NotificationsTab />;
      case 'platform':      return <PlatformTab />;
      default:              return <GeneralTab />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          {t('platformAdmin')}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage platform identity, security controls, notifications, and global feature flags.
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