import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';

const ROLE_REDIRECTS = {
  platform_admin: '/platform/dashboard',
  clinic_admin: '/admin/dashboard',
  branch_manager: '/manager/dashboard',
  accountant: '/accountant/dashboard',
  receptionist: '/receptionist/dashboard',
  dentist: '/dentist/dashboard',
  patient: '/patient/dashboard',
  lab_technician: '/lab/dashboard',
};

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clinic = useAuthStore((s) => s.clinic);
  const branch = useAuthStore((s) => s.branch);

  const [form, setForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await apiClient.post('/auth/change-password', form);
      const updatedUser = { ...user, must_change_password: false };
      setAuth(updatedUser, clinic, branch);
      navigate(ROLE_REDIRECTS[updatedUser.role] || '/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Change Password</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">Set a new password before continuing.</p>

        {error && (
          <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
        <input
          name="current_password"
          type="password"
          value={form.current_password}
          onChange={updateField}
          className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
          className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
          minLength={8}
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
        <input
          name="password_confirmation"
          type="password"
          value={form.password_confirmation}
          onChange={updateField}
          className="mb-5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
          minLength={8}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Password'}
        </button>
      </form>
    </div>
  );
}
