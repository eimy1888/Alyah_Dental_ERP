import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, Plus, X, Edit2, Trash2, Eye, EyeOff, 
  CheckCircle, AlertCircle, Building2, Mail, Phone, MapPin, 
  Globe, Clock, DollarSign, Stethoscope, Heart, Smile, 
  Scissors, Syringe, Activity, Shield, 
  User, Bell, Plug, FileText, Home, Settings as SettingsIcon,
  Save, Lock, TrendingUp, Users, Star, Calendar, Menu, CreditCard
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';

// ── API ───────────────────────────────────────────────────────────────────────
const fetchSettings = () =>
  apiClient.get('/admin/settings').then(r => r.data);

const updateClinic = (data) =>
  apiClient.put('/admin/settings/clinic', data).then(r => r.data);

const updateAdmin = (data) =>
  apiClient.put('/admin/settings/admin', data).then(r => r.data);

const updatePassword = (data) =>
  apiClient.post('/admin/settings/change-password', data).then(r => r.data);

const updateNotifications = (data) =>
  apiClient.put('/admin/settings/notifications', data).then(r => r.data);

const updateTaxInvoice = (data) =>
  apiClient.put('/admin/settings/tax-invoice', data).then(r => r.data);

// ── Showcase API ──────────────────────────────────────────────────────────────
const fetchShowcaseSettings = () =>
  apiClient.get('/admin/settings/showcase').then(r => r.data?.data || {});

const updateShowcaseSettings = (data) =>
  apiClient.put('/admin/settings/showcase', data).then(r => r.data);

const fetchServices = () =>
  apiClient.get('/admin/services').then(r => r.data);

const createService = (data) =>
  apiClient.post('/admin/services', data).then(r => r.data);

const updateService = ({ id, ...data }) =>
  apiClient.put(`/admin/services/${id}`, data).then(r => r.data);

const deleteService = (id) =>
  apiClient.delete(`/admin/services/${id}`).then(r => r.data);

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
      <CheckCircle className="w-4 h-4" />
      <span className="text-sm">{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-gray-500" />}
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

// ── Service Icons Options ─────────────────────────────────────────────────────
const SERVICE_ICONS = [
  { value: 'Stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'Smile', label: 'Smile', icon: Smile },
  { value: 'Scissors', label: 'Scissors', icon: Scissors },
  { value: 'Syringe', label: 'Syringe', icon: Syringe },
  { value: 'Activity', label: 'Activity', icon: Activity },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'FileText', label: 'File Text', icon: FileText },
  { value: 'Calendar', label: 'Calendar', icon: Calendar },
  { value: 'Clock', label: 'Clock', icon: Clock },
];

const SERVICE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'restorative', label: 'Restorative' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'emergency', label: 'Emergency' },
];

// ── Social Input Component (moved outside to avoid render-time creation) ─────
function SocialInput({ platform, label, value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        placeholder={`https://${platform}.com/your-page`}
        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
      />
    </div>
  );
}

// ── Service Modal ─────────────────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave, saving }) {
  const isEdit = !!service;
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    category: service?.category || 'general',
    duration_minutes: service?.duration_minutes || 30,
    price: service?.price || '',
    icon_url: service?.icon_url || '',
    is_published: service?.is_published ?? true,
  });
  const [errors, setErrors] = useState({});
  const [iconType, setIconType] = useState(service?.icon_url?.startsWith('http') ? 'url' : 'icon');

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Service name is required';
    if (!form.price) e.price = 'Price is required';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(isEdit ? { id: service.id, ...form } : form);
  };

  const getIconPreview = () => {
    const found = SERVICE_ICONS.find(i => i.value === form.icon_url);
    if (found && found.icon) {
      const IconComp = found.icon;
      return <IconComp className="w-5 h-5 text-blue-600" />;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Service' : 'Add New Service'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Service Name *
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`w-full px-4 py-2 rounded-xl border text-sm focus:border-blue-400 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
              >
                {SERVICE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Price (ETB) *
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border text-sm focus:border-blue-400 ${errors.price ? 'border-red-300' : 'border-gray-200'}`}
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Published
              </label>
              <div className="flex items-center gap-3 pt-2">
                <Toggle enabled={form.is_published} onChange={(v) => set('is_published', v)} />
                <span className="text-sm text-gray-500">{form.is_published ? 'Visible on website' : 'Hidden'}</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Icon
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIconType('icon')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${iconType === 'icon' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Select Icon
              </button>
              <button
                type="button"
                onClick={() => setIconType('url')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${iconType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Enter URL
              </button>
            </div>
            {iconType === 'icon' ? (
              <div className="flex gap-2">
                <select
                  value={form.icon_url}
                  onChange={e => set('icon_url', e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
                >
                  <option value="">Select an icon</option>
                  {SERVICE_ICONS.map(icon => (
                    <option key={icon.value} value={icon.value}>{icon.label}</option>
                  ))}
                </select>
                {getIconPreview() && (
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    {getIconPreview()}
                  </div>
                )}
              </div>
            ) : (
              <input
                value={form.icon_url}
                onChange={e => set('icon_url', e.target.value)}
                placeholder="https://example.com/icon.png"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">Choose from common icons or enter a custom image URL</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Service')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ name, onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">Delete Service</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <span className="font-semibold">{name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, showToast }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => { showToast('Password updated successfully.'); onClose(); },
    onError: (e) => setErr(e?.response?.data?.message || 'Failed to update password.'),
  });

  const handleSave = () => {
    setErr('');
    if (!form.current_password || !form.new_password || !form.new_password_confirmation) {
      setErr('All fields are required.'); return;
    }
    if (form.new_password.length < 8) {
      setErr('New password must be at least 8 characters.'); return;
    }
    if (form.new_password !== form.new_password_confirmation) {
      setErr('Passwords do not match.'); return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">Security</p>
            <h2 className="text-white text-xl font-bold mt-0.5">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{err}</div>}
          
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={form.current_password}
              onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={form.new_password}
              onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
              placeholder="Min 8 characters"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={form.new_password_confirmation}
              onChange={e => setForm(p => ({ ...p, new_password_confirmation: e.target.value }))}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: Clinic Profile (WITH CARD PRICE) ─────────────────────────────────────
function ClinicProfileTab({ settings, showToast }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: settings.name || '',
    email: settings.email || '',
    phone: settings.phone || '',
    address: settings.address || '',
    city: settings.city || '',
    invoice_prefix: settings.invoice_prefix || 'INV',
    theme: settings.theme || 'default',
    card_price: settings.card_price || 100,
  });

  // FIX: Use useEffect without setState - just update when settings change
  useEffect(() => {
    // Set form directly without calling setState
    const newForm = {
      name: settings.name || '',
      email: settings.email || '',
      phone: settings.phone || '',
      address: settings.address || '',
      city: settings.city || '',
      invoice_prefix: settings.invoice_prefix || 'INV',
      theme: settings.theme || 'default',
      card_price: settings.card_price || 100,
    };
    setForm(newForm);
  }, [settings.name, settings.email, settings.phone, settings.address, settings.city, settings.invoice_prefix, settings.theme, settings.card_price]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: updateClinic,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); showToast('Clinic profile updated.'); },
    onError: (e) => showToast(e?.response?.data?.message || 'Update failed.'),
  });

  const themes = ['default', 'green', 'dark'];

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl px-8 py-8 mb-6 text-white">
        <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-2">Clinic Profile</p>
        <h1 className="text-3xl font-bold">{form.name || 'Your Clinic'}</h1>
        <p className="text-blue-200 mt-1 text-sm">{form.city || ''}</p>
      </div>

      <Section title="Clinic Information" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Clinic Name
            </label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Clinic Email
            </label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              City
            </label>
            <Input value={form.city} onChange={e => set('city', e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Address
            </label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Invoice Prefix
            </label>
            <Input value={form.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Clinic Card Price (ETB)
            </label>
            <Input 
              type="number" 
              step="10" 
              min="50" 
              max="500" 
              value={form.card_price} 
              onChange={e => set('card_price', e.target.value)} 
            />
            <p className="text-xs text-gray-400 mt-1">Amount patients pay for clinic card (one-time fee). Default: 100 ETB</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {themes.map(t => (
                <button key={t} onClick={() => set('theme', t)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${form.theme === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </Section>
    </>
  );
}

// ── TAB: Admin Profile ────────────────────────────────────────────────────────
function AdminProfileTab({ admin, showToast }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: admin.name || '', email: admin.email || '', phone: admin.phone || '' });
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => {
    setForm({ name: admin.name || '', email: admin.email || '', phone: admin.phone || '' });
  }, [admin.name, admin.email, admin.phone]);

  const mutation = useMutation({
    mutationFn: updateAdmin,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); showToast('Profile updated.'); },
    onError: (e) => showToast(e?.response?.data?.message || 'Update failed.'),
  });

  const initials = admin.name ? admin.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';

  return (
    <>
      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} showToast={showToast} />}
      <Section title="Personal Information" icon={User}>
        <div className="flex items-center gap-5 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{admin.name}</p>
            <p className="text-sm text-gray-400 capitalize">{admin.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Role
            </label>
            <Input value={admin.role} disabled />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => setShowPwModal(true)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
            <Lock className="w-4 h-4 inline mr-2" /> Change Password
          </button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </Section>
    </>
  );
}

// ── TAB: Notifications ────────────────────────────────────────────────────────
function NotificationsTab({ notifications, showToast }) {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState(notifications);

  useEffect(() => {
    setPrefs(notifications);
  }, [notifications]);

  const mutation = useMutation({
    mutationFn: updateNotifications,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); showToast('Preferences saved.'); },
  });

  const togglePref = (key) => { const updated = { ...prefs, [key]: !prefs[key] }; setPrefs(updated); mutation.mutate({ [key]: !prefs[key] }); };

  const items = [
    { key: 'queue_alerts', label: 'Queue Alerts', icon: Users, desc: 'Notify when patient queue exceeds threshold' },
    { key: 'low_stock', label: 'Low Stock Warnings', icon: AlertCircle, desc: 'Alert when inventory drops below reorder point' },
    { key: 'claim_updates', label: 'Claim Updates', icon: FileText, desc: 'Insurance claim status changes and approvals' },
    { key: 'failed_payments', label: 'Failed Payments', icon: AlertCircle, desc: 'Notify on payment gateway failures' },
    { key: 'appointment_reminders', label: 'Appointment Reminders', icon: Calendar, desc: 'Daily summary of upcoming appointments' },
    { key: 'staff_attendance', label: 'Staff Attendance', icon: Users, desc: 'Late check-in and absence notifications' },
  ];

  return (
    <Section title="Notification Preferences" icon={Bell}>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={item.key} className={`flex items-center justify-between py-4 ${i < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${prefs[item.key] ? 'text-green-600' : 'text-gray-400'}`}>
                {prefs[item.key] ? 'Enabled' : 'Disabled'}
              </span>
              <Toggle enabled={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── TAB: Tax & Invoice ────────────────────────────────────────────────────────
function TaxInvoiceTab({ settings, showToast }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tax_rate: settings.tax_rate || '15',
    payment_terms: settings.payment_terms || 'Due upon receipt',
    invoice_footer: settings.invoice_footer || '',
    invoice_prefix: settings.invoice_prefix || 'INV',
  });

  useEffect(() => {
    setForm({
      tax_rate: settings.tax_rate || '15',
      payment_terms: settings.payment_terms || 'Due upon receipt',
      invoice_footer: settings.invoice_footer || '',
      invoice_prefix: settings.invoice_prefix || 'INV',
    });
  }, [settings.tax_rate, settings.payment_terms, settings.invoice_footer, settings.invoice_prefix]);

  const mutation = useMutation({
    mutationFn: updateTaxInvoice,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); showToast('Tax & invoice settings saved.'); },
  });

  return (
    <Section title="Tax & Invoice Settings" icon={DollarSign}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Tax Rate (%)
          </label>
          <Input value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="15" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Default Payment Terms
          </label>
          <select
            value={form.payment_terms}
            onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option>Due upon receipt</option>
            <option>Net 7 days</option>
            <option>Net 15 days</option>
            <option>Net 30 days</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Invoice Prefix
          </label>
          <Input value={form.invoice_prefix} onChange={e => setForm(p => ({ ...p, invoice_prefix: e.target.value }))} placeholder="INV" />
        </div>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Invoice Footer Text
        </label>
        <textarea
          value={form.invoice_footer}
          onChange={e => setForm(p => ({ ...p, invoice_footer: e.target.value }))}
          rows={3}
          placeholder="Thank you for choosing our clinic..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs text-blue-700 font-semibold mb-1">Invoice Preview</p>
        <p className="text-xs text-blue-600">
          Prefix: <strong>{form.invoice_prefix}-####</strong> · Tax: <strong>{form.tax_rate}%</strong> · Terms: <strong>{form.payment_terms}</strong>
        </p>
        {form.invoice_footer && <p className="text-xs text-blue-500 mt-1 italic">"{form.invoice_footer}"</p>}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
        </button>
      </div>
    </Section>
  );
}

// ── TAB: Integrations ─────────────────────────────────────────────────────────
function IntegrationsTab({ showToast }) {
  const devices = [
    { name: 'Chairside Terminal', location: 'Bole Flagship · Chair 1', status: 'Online' },
    { name: 'Reception Kiosk', location: 'Bole Flagship · Front Desk', status: 'Online' },
    { name: 'X-Ray Scanner', location: 'Kazanchis · X-Ray Room', status: 'Offline' },
  ];
  const gateways = [
    { name: 'Telebirr', logo: '📱', status: 'Connected' },
    { name: 'Chapa', logo: '💳', status: 'Connected' },
  ];

  return (
    <>
      <Section title="Connected Devices" icon={Plug}>
        <div className="space-y-3">
          {devices.map(d => (
            <div key={d.name} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-sm">💻</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.location}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${d.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Payment Gateways" icon={CreditCard}>
        <div className="space-y-4">
          {gateways.map(g => (
            <div key={g.name} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{g.logo}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{g.name}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{g.status}</span>
                </div>
              </div>
              <button onClick={() => showToast(`${g.name} connection test passed ✓`)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white font-medium">
                Test
              </button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── TAB: Showcase - Clinic Profile ────────────────────────────────────────────
function ShowcaseClinicProfileTab({ showcaseSettings, showToast, onUpdate }) {
  const [form, setForm] = useState({
    hero_title: showcaseSettings?.hero_title || '',
    hero_subtitle: showcaseSettings?.hero_subtitle || '',
    hero_image_url: showcaseSettings?.hero_image_url || '',
    specialty: showcaseSettings?.specialty || '',
    contact_email: showcaseSettings?.contact_email || '',
    contact_phone: showcaseSettings?.contact_phone || '',
    contact_address: showcaseSettings?.contact_address || '',
    social_links: showcaseSettings?.social_links || { facebook: '', instagram: '', twitter: '', linkedin: '' },
    stats: showcaseSettings?.stats || { monthly_patients: 800, satisfaction_rate: 98, years_experience: 15, happy_patients: 15000 },
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSocial = (platform, value) => setForm(p => ({ ...p, social_links: { ...p.social_links, [platform]: value } }));
  const setStat = (key, value) => setForm(p => ({ ...p, stats: { ...p.stats, [key]: parseInt(value) || 0 } }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onUpdate(form);
      showToast('Showcase settings updated');
    } catch (error) {
      showToast('Update failed', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Hero Section" icon={Home}>
        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Hero Title
            </label>
            <Input value={form.hero_title} onChange={e => set('hero_title', e.target.value)} placeholder="Your healthy smile starts here" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Hero Subtitle
            </label>
            <Textarea value={form.hero_subtitle} onChange={e => set('hero_subtitle', e.target.value)} placeholder="Experience world-class dental care..." />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Hero Image URL
            </label>
            <Input value={form.hero_image_url} onChange={e => set('hero_image_url', e.target.value)} placeholder="https://example.com/hero-image.jpg" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Specialty / Focus Area
            </label>
            <Input
              value={form.specialty}
              onChange={e => set('specialty', e.target.value)}
              placeholder="e.g. Orthodontics & Pediatric, Restorative & Cosmetic"
            />
            <p className="text-xs text-gray-400 mt-1">Shown as a badge on the public showcase listing.</p>
          </div>
        </div>
      </Section>

      <Section title="Contact Information" icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contact Email
            </label>
            <Input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="info@clinic.com" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+251 911 000 000" />
          </div>

          <div className="mb-4 md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contact Address
            </label>
            <Input value={form.contact_address} onChange={e => set('contact_address', e.target.value)} placeholder="Bole Road, Addis Ababa" />
          </div>
        </div>
      </Section>

      <Section title="Social Links" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SocialInput 
            platform="facebook" 
            label="Facebook" 
            value={form.social_links.facebook}
            onChange={(e) => setSocial('facebook', e.target.value)}
          />
          <SocialInput 
            platform="instagram" 
            label="Instagram" 
            value={form.social_links.instagram}
            onChange={(e) => setSocial('instagram', e.target.value)}
          />
          <SocialInput 
            platform="twitter" 
            label="Twitter" 
            value={form.social_links.twitter}
            onChange={(e) => setSocial('twitter', e.target.value)}
          />
          <SocialInput 
            platform="linkedin" 
            label="LinkedIn" 
            value={form.social_links.linkedin}
            onChange={(e) => setSocial('linkedin', e.target.value)}
          />
        </div>
      </Section>

      <Section title="Statistics (Dashboard Numbers)" icon={TrendingUp}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Monthly Patients
            </label>
            <input
              type="number"
              value={form.stats.monthly_patients}
              onChange={e => setStat('monthly_patients', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Satisfaction Rate (%)
            </label>
            <input
              type="number"
              value={form.stats.satisfaction_rate}
              onChange={e => setStat('satisfaction_rate', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Years Experience
            </label>
            <input
              type="number"
              value={form.stats.years_experience}
              onChange={e => setStat('years_experience', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Happy Patients
            </label>
            <input
              type="number"
              value={form.stats.happy_patients}
              onChange={e => setStat('happy_patients', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-400"
            />
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} <Save className="w-4 h-4" /> Save Showcase Settings
        </button>
      </div>
    </div>
  );
}

// ── TAB: Showcase - Services Management ───────────────────────────────────────
function ShowcaseServicesTab({ showToast }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await fetchServices();
      setServices(res.data || []);
    } catch (error) {
      showToast('Failed to load services', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServices(); }, []);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createService(data);
      showToast('Service added successfully');
      setShowModal(false);
      loadServices();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to add service', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await updateService(data);
      showToast('Service updated successfully');
      setShowModal(false);
      setEditingService(null);
      loadServices();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to update service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteService(deleteTarget.id);
      showToast('Service deleted successfully');
      setDeleteTarget(null);
      loadServices();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to delete service', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublish = async (service) => {
    try {
      await updateService({ id: service.id, is_published: !service.is_published });
      showToast(service.is_published ? 'Service hidden from website' : 'Service published to website');
      loadServices();
    } catch (error) {
      showToast('Failed to update service status', error);
    }
  };

  const formatCurrency = (amount) => `ETB ${amount?.toLocaleString() || 0}`;

  const getIconDisplay = (iconUrl) => {
    if (!iconUrl) return <FileText className="w-5 h-5 text-gray-400" />;
    if (iconUrl.startsWith('http')) return <img src={iconUrl} alt="icon" className="w-5 h-5 object-contain" />;
    const found = SERVICE_ICONS.find(i => i.value === iconUrl);
    if (found && found.icon) {
      const IconComp = found.icon;
      return <IconComp className="w-5 h-5 text-blue-600" />;
    }
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div>
      {showModal && (
        <ServiceModal
          service={editingService}
          onClose={() => { setShowModal(false); setEditingService(null); }}
          onSave={editingService ? handleUpdate : handleCreate}
          saving={saving}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditingService(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No services added yet. Click "Add Service" to create your first service.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    {getIconDisplay(s.icon_url)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{s.category}</p>
                  </div>
                </div>
                <button onClick={() => handleTogglePublish(s)} className="p-1 rounded-lg hover:bg-gray-100">
                  {s.is_published ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{s.description || 'No description'}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{s.duration_minutes} min</span>
                <span className="font-bold text-blue-600">{formatCurrency(s.price)}</span>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => { setEditingService(s); setShowModal(true); }} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Edit
                </button>
                <button onClick={() => setDeleteTarget(s)} className="flex-1 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Settings Component ───────────────────────────────────────────────────
const TABS = [
  { id: 'clinic', label: 'Clinic Profile', icon: Building2 },
  { id: 'admin', label: 'Admin Profile', icon: User },
  { id: 'showcase_clinic', label: 'Showcase - Clinic', icon: Home },
  { id: 'showcase_services', label: 'Showcase - Services', icon: Stethoscope },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'tax', label: 'Tax & Invoice', icon: DollarSign },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('clinic');
  const [toast, setToast] = useState(null);
  const queryClient = useQueryClient();

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 60000,
  });

  // Separate query for showcase settings (uses the dedicated GET endpoint)
  const { data: showcaseData } = useQuery({
    queryKey: ['showcase-settings'],
    queryFn: fetchShowcaseSettings,
    staleTime: 60000,
    enabled: activeTab === 'showcase_clinic',
  });

  const clinic = data?.data?.clinic || {};
  const admin = data?.data?.admin || {};
  const notifications = clinic.notifications || { queue_alerts: true, low_stock: true, claim_updates: true, failed_payments: false, appointment_reminders: true, staff_attendance: false };
  const showcaseSettings = showcaseData || {};

  const updateShowcaseMutation = useMutation({
    mutationFn: updateShowcaseSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['showcase-settings'] });
    },
  });

  const handleUpdateShowcase = async (data) => {
    await updateShowcaseMutation.mutateAsync(data);
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center items-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
  }

  if (isError) {
    return <div className="p-6 text-center text-red-500 text-sm">Failed to load settings. Please refresh.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toast msg={toast?.msg} onClose={() => setToast(null)} />

      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Clinic Admin / Settings</p>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 mb-6 flex flex-wrap gap-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'clinic' && <ClinicProfileTab settings={clinic} showToast={showToast} />}
      {activeTab === 'admin' && <AdminProfileTab admin={admin} showToast={showToast} />}
      {activeTab === 'showcase_clinic' && <ShowcaseClinicProfileTab showcaseSettings={showcaseSettings} showToast={showToast} onUpdate={handleUpdateShowcase} />}
      {activeTab === 'showcase_services' && <ShowcaseServicesTab showToast={showToast} />}
      {activeTab === 'notifications' && <NotificationsTab notifications={notifications} showToast={showToast} />}
      {activeTab === 'integrations' && <IntegrationsTab showToast={showToast} />}
      {activeTab === 'tax' && <TaxInvoiceTab settings={clinic} showToast={showToast} />}
    </div>
  );
}