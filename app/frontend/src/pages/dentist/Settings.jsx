import { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, MapPin, Shield, 
  Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle,
  Calendar, Clock, Award
} from 'lucide-react';
import { getProfile, updateProfile, changePassword, getClinicInfo } from '../../services/dentistService';

export default function DentistSettings() {
  const [profile, setProfile] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
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
        getClinicInfo()
      ]);
      setProfile(profileData);
      setClinicInfo(clinicData);
      setFormData({
        name: profileData.name || '',
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

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await updateProfile(formData);
      setProfile(response.data);
      showToastMessage('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
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
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (error) {
      if (error.response?.data?.errors) {
        setPasswordErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        showToastMessage(error.response.data.message, 'error');
      } else {
        showToastMessage('Failed to change password', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Change Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)} 
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="p-6 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none pr-11 ${
                        passwordErrors.old_password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.old_password && (
                    <p className="mt-1.5 text-xs text-red-500">{passwordErrors.old_password[0]}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none pr-11 ${
                        passwordErrors.new_password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
                      }`}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <p className="mt-1.5 text-xs text-red-500">{passwordErrors.new_password[0]}</p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-400">
                    Minimum 8 characters, mixed case, and numbers.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.new_password_confirmation}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password_confirmation: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none pr-11 ${
                        passwordErrors.new_password_confirmation ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.new_password_confirmation && (
                    <p className="mt-1.5 text-xs text-red-500">{passwordErrors.new_password_confirmation[0]}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Dentist Workspace
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your profile, password, and view clinic information.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1F4E79] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Profile Information</h2>
                  <p className="text-xs text-gray-500">Update your personal information</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 911 000 000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 transition-colors disabled:opacity-50"
                >
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Security</h2>
                  <p className="text-xs text-gray-500">Change your password</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
              <p className="text-xs text-gray-400 mt-3">
                For security, we recommend changing your password regularly.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Clinic & Branch Info */}
        <div className="space-y-6">
          
          {/* Clinic Info Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">Clinic Information</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Clinic Name</p>
                <p className="text-sm font-semibold text-gray-800">{clinicInfo?.clinic?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {clinicInfo?.clinic?.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Branch Info Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Branch Information</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Branch Name</p>
                <p className="text-sm font-semibold text-gray-800">{clinicInfo?.branch?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Location</p>
                <p className="text-sm text-gray-600">{clinicInfo?.branch?.location || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Manager</p>
                <p className="text-sm text-gray-600">{clinicInfo?.branch?.manager_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                <p className="text-sm text-gray-600">{clinicInfo?.branch?.phone || '—'}</p>
              </div>
            </div>
          </div>

          {/* Role Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-900">Your Role</h3>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Dentist</p>
                  <p className="text-xs text-gray-400">Full clinical access to assigned patients</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Account Stats</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Joined</span>
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {profile?.created_at || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Last Updated</span>
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