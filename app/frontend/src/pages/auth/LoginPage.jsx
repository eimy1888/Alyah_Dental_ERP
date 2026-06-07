import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Building2, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const FEATURES = [
  { icon: Building2,   label: 'Clinic Management',    desc: 'Approve and oversee all registered clinics' },
  { icon: Users,       label: 'Subscription Control', desc: 'Manage plans, billing, and tenant accounts' },
  { icon: TrendingUp,  label: 'Platform Analytics',   desc: 'Real-time MRR, growth, and SLA metrics' },
  { icon: ShieldCheck, label: 'Compliance & Security', desc: 'Document review and audit trail' },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn, loginError } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    await login(data, { requireRole: 'platform_admin' });
  };

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── LEFT PANEL — light blue gradient with big logo ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #EFF6FF 0%, #DBEAFE 35%, #E0F2FE 65%, #F0F9FF 100%)',
        }}
      >
        {/* Soft orb accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          {/* Very subtle dot grid */}
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(rgba(37,99,235,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 py-12 text-center">

          {/* BIG LOGO */}
          <div className="mb-10">
            <img
              src="/brand/alyah-logo.svg"
              alt="Alyah Dental ERP"
              className="w-auto mx-auto"
              style={{
                height: 130,
                filter: 'drop-shadow(0 8px 32px rgba(37,99,235,0.18)) drop-shadow(0 2px 8px rgba(6,182,212,0.12))',
              }}
            />
          </div>

          {/* Tagline */}
          <h2 className="text-[1.65rem] font-black text-gray-900 leading-[1.1] tracking-tight mb-3">
            The operating system<br />
            <span className="text-blue-600">for modern dentistry.</span>
          </h2>
          <p className="text-[13.5px] text-gray-500 leading-relaxed max-w-xs">
            Full oversight of every clinic, subscription, and platform metric — all in one place.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 mt-10 w-full max-w-sm">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label}
                className="rounded-2xl p-4 bg-white/70 border border-blue-100/80 backdrop-blur-sm text-left hover:bg-white/90 hover:shadow-sm transition-all">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-blue-50 border border-blue-100">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[12px] font-bold text-gray-800 leading-snug mb-0.5">{label}</p>
                <p className="text-[10.5px] text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 px-10 py-5 border-t border-blue-100/60 bg-white/30 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {[
              { value: '126+',   label: 'Active Clinics' },
              { value: '99.98%', label: 'Uptime SLA' },
              { value: '6',      label: 'Role Types' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[17px] font-black text-blue-600">{s.value}</p>
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">All systems live</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — clean white login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Link to="/">
            <img src="/brand/alyah-logo.svg" alt="Alyah Dental ERP" className="h-12 w-auto object-contain mx-auto" />
          </Link>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em] uppercase text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-5">
              <ShieldCheck className="w-3 h-3" />
              Secured Access
            </div>
            <h2 className="text-[1.85rem] font-black text-gray-900 leading-tight tracking-tight">
              Welcome back
            </h2>
            <p className="text-[13.5px] text-gray-400 mt-1.5">
              Sign in to the Alyah administration console
            </p>
          </div>

          {/* Error */}
          {loginError && (
            <div className="mb-6 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@alyahdental.com"
                autoComplete="email"
                {...register('email')}
                className={`w-full px-4 py-3.5 rounded-2xl border text-[14px] outline-none transition-all
                  focus:ring-2 focus:ring-blue-500/15
                  ${errors.email
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-gray-200 bg-gray-50/80 focus:border-blue-400 focus:bg-white'
                  }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />{errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">
                  Password
                </label>
                <a href="#" className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full px-4 py-3.5 rounded-2xl border text-[14px] outline-none transition-all pr-12
                    focus:ring-2 focus:ring-blue-500/15
                    ${errors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 bg-gray-50/80 focus:border-blue-400 focus:bg-white'
                    }`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />{errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-[14px] transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)',
                boxShadow: '0 6px 24px rgba(37,99,235,0.30)',
              }}
            >
              {isLoggingIn
                ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                : 'Sign in to Console'
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-300 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Secondary links */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-2.5 text-center">
            <p className="text-[13px] text-gray-500">
              Clinic staff or patient?{' '}
              <Link to="/clinic/login" className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                Clinic Login →
              </Link>
            </p>
            <p className="text-[13px] text-gray-500">
              New clinic?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                Register your clinic →
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-gray-300 mt-7">
            © 2026 Alyah Dental ERP · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
