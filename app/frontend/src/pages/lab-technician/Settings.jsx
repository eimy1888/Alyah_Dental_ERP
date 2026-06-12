import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Loader2, Check } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import { useToast } from '../../components/ui/Toast';

export default function LabSettings() {
  const { success, error: toastError } = useToast();

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile,  setSavingProfile]  = useState(false);

  const [passwords, setPasswords] = useState({
    old_password: '', new_password: '', new_password_confirmation: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get('/lab/settings/profile')
      .then(r => {
        const d = r.data.data;
        setProfile({ name: d.name || '', email: d.email || '', phone: d.phone || '' });
      })
      .catch(() => toastError('Failed to load profile.'))
      .finally(() => setLoadingProfile(false));
  }, []);

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiClient.put('/lab/settings/profile', profile);
      success('Profile updated successfully.');
    } catch (err) {
      toastError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwErrors({});
    setSavingPassword(true);
    try {
      await apiClient.post('/lab/settings/change-password', passwords);
      success('Password changed successfully.');
      setPasswords({ old_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      if (err?.response?.data?.errors) {
        setPwErrors(err.response.data.errors);
      } else {
        toastError(err?.response?.data?.message || 'Failed to change password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-2xl">
      {/* Header */}
      <div>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.14em]">Lab Technician</p>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Settings</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Manage your profile and security settings</p>
      </div>

      {/* Profile section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-gray-900">Profile</h2>
            <p className="text-[11px] text-gray-400">Update your name, email, and phone number</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Change password */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
            <Lock className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-gray-900">Change Password</h2>
            <p className="text-[11px] text-gray-400">Use a strong password with mixed case and numbers</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          {[
            { key: 'old_password',             label: 'Current Password' },
            { key: 'new_password',             label: 'New Password' },
            { key: 'new_password_confirmation',label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.14em] mb-1.5">
                {label} *
              </label>
              <input
                type="password"
                value={passwords[key]}
                onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                required
                className={`w-full px-4 py-2.5 rounded-xl border text-[13px] outline-none focus:border-blue-400 transition-colors ${pwErrors[key] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {pwErrors[key] && (
                <p className="mt-1 text-[11px] text-red-500">{pwErrors[key][0]}</p>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-[13px] font-bold hover:bg-orange-700 disabled:opacity-60 transition-colors"
            >
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {savingPassword ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
