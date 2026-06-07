import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building2, MapPin, Shield,
  Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle,
  Calendar, Clock, Award, X
} from 'lucide-react';
import {
  getProfile, updateProfile, changePassword, getClinicInfo
} from '../../services/accountantService';

export default function AccountantSettings() {
  const [profile, setProfile]         = useState(null);
  const [clinicInfo, setClinicInfo]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast]             = useState(null);

  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  const [passwordErrors, setPasswordErrors] = useState({});

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, clinicData] = await Promise.all([
        getProfile(),
        getClinicInfo(),
      ]);
      setProfile(profileData);
      setClinicInfo(clinicData);
      setFormData({
        name:  profileData.name  || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToastMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await updateProfile(formData);
      setProfile(response.data);
      showToastMessage('Profile updated successfully');
    } catch {
      showToastMessage('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setSaving(true);
    try {
      await changePassword(passwordData);
      showToastMessage('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (error) {
      if (error.response?.data?.errors) {
        setPasswordErrors(error.response.data.errors);
      } else {
        showToastMessage(error.response?.data?.message || 'Failed to change password', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl px-4 py-3
          text-sm font-semibold text-white shadow-lg
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'success'
            ? <CheckCircle className="h-4 w-4" />
            : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1.5 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4 p-6">

                {/* Current Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className={`w-full rounded-xl border py-3 pl-4 pr-11 text-sm outline-none
                        ${passwordErrors.current_password
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 focus:border-blue-400'}`}
                      required
                    />
                    <button type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <p className="mt-1.5 text-xs text-red-500">{passwordErrors.current_password[0]}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className={`w-full rounded-xl border py-3 pl-4 pr-11 text-sm outline-none
                        ${passwordErrors.new_password
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 focus:border-blue-400'}`}
                      required
                      minLength={8}
                    />
                    <button type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <p className="mt-1.5 text-xs text-red-500">{passwordErrors.new_password[0]}</p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-400">Minimum 8 characters.</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.new_password_confirmation}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password_confirmation: e.target.value })}
                      className={`w-full rounded-xl border py-3 pl-4 pr-11 text-sm outline-none
                        ${passwordErrors.new_password_confirmation
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 focus:border-blue-400'}`}
                      required
                    />
                    <button type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.new_password_confirmation && (
                    <p className="mt-1.5 text-xs text-red-500">{passwordErrors.new_password_confirmation[0]}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6">
                <button type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#1F4E79] px-5 py-2.5
                    text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-600">
          Account Settings
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile, password, and view clinic information.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left — Profile + Security */}
        <div className="space-y-6 lg:col-span-2">

          {/* Profile Card */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F4E79]">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Profile Information</h2>
                  <p className="text-xs text-gray-500">Update your personal information</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
                    required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
                    required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="tel" value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 911 000 000"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#1F4E79] px-6 py-2.5
                    text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
                  {saving
                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Card */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Security</h2>
                  <p className="text-xs text-gray-500">Change your account password</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5
                  text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Lock className="h-4 w-4" />
                Change Password
              </button>
              <p className="mt-3 text-xs text-gray-400">
                For security, we recommend changing your password regularly.
              </p>
            </div>
          </div>
        </div>

        {/* Right — Clinic info */}
        <div className="space-y-6">

          {/* Clinic Info */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-white px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">Clinic Information</h3>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <p className="mb-0.5 text-xs text-gray-400">Clinic Name</p>
                <p className="text-sm font-semibold text-gray-800">{clinicInfo?.clinic?.name || '—'}</p>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-400">Address</p>
                <p className="text-sm text-gray-600">{clinicInfo?.clinic?.address || '—'}</p>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-400">Contact</p>
                <p className="text-sm text-gray-600">
                  {clinicInfo?.clinic?.phone || '—'} · {clinicInfo?.clinic?.email || '—'}
                </p>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-400">Status</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  {clinicInfo?.clinic?.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Branches */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Branches</h3>
              </div>
            </div>
            <div className="space-y-3 p-5">
              {!clinicInfo?.branches?.length ? (
                <p className="text-sm text-gray-400">No branches found.</p>
              ) : (
                clinicInfo.branches.map((branch) => (
                  <div key={branch.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <p className="text-sm font-semibold text-gray-800">{branch.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{branch.location}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Role */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white px-5 py-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-900">Your Role</h3>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Accountant</p>
                  <p className="text-xs text-gray-400">Full financial access across all branches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-bold text-gray-900">Account Stats</h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Joined</span>
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Today</span>
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}