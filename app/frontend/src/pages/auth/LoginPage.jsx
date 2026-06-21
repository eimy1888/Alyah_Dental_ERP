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

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[48%] flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #EFF6FF 0%, #DBEAFE 35%, #E0F2FE 65%, #F0F9FF 100%)',
        }}
      >
        {/* Soft orb accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[360px] h-[360px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 65%)', filter: 'blur(50px)' }} />
          <div className="absolute -bottom-16 -right-16 w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)', filter: 'blur(50px)' }} />
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(rgba(37,99,235,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-10 py-8 text-center">

          {/* Logo */}
          <div className="mb-7">
            <img
              src="/brand/alyah-logo.svg"
              alt="Alyah Dental ERP"
              className="w-auto mx-auto"
              style={{
                height: 90,
                filter: 'drop-shadow(0 6px 20px rgba(37,99,235,0.18))',
              }}
            />
          </div>

          {/* Tagline */}
          <h2 className="text-[1.35rem] font-black text-gray-900 leading-[1.15] tracking-tight mb-2">
            The operating system<br />
            <span className="text-blue-600">for modern dentistry.</span>
          </h2>
          <p className="text-[12.5px] text-gray-500 leading-relaxed max-w-xs">
            Full oversight of every clinic, subscription, and platform metric — all in one place.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-2.5 mt-7 w-full max-w-xs">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label}
                className="rounded-xl p-3 bg-white/70 border border-blue-100/80 backdrop-blur-sm text-left hover:bg-white/90 transition-all">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 bg-blue-50 border border-blue-100">
                  <Icon className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-[11px] font-bold text-gray-800 leading-snug mb-0.5">{label}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 px-8 py-4 border-t border-blue-100/60 bg-white/30 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            {[
              { value: '126+',   label: 'Active Clinics' },
              { value: '99.98%', label: 'Uptime SLA' },
              { value: '6',      label: 'Role Types' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[15px] font-black text-blue-600">{s.value}</p>
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[9px] text-emerald-600 font-semibold">All systems live</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-7">
          <Link to="/">
            <img src="/brand/alyah-logo.svg" alt="Alyah Dental ERP" className="h-10 w-auto object-contain mx-auto" />
          </Link>
        </div>

        <div className="w-full max-w-[360px]">

          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em] uppercase text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
              <ShieldCheck className="w-3 h-3" />
              Secured Access
            </div>
            <h2 className="text-[1.6rem] font-black text-gray-900 leading-tight tracking-tight">
              Welcome back
            </h2>
            <p className="text-[13px] text-gray-400 mt-1">
              Sign in to the Alyah administration console
            </p>
          </div>

          {/* Error */}
          {loginError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@alyahdental.com"
                autoComplete="email"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border text-[13.5px] outline-none transition-all
                  focus:ring-2 focus:ring-blue-500/15
                  ${errors.email
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-gray-200 bg-gray-50/80 focus:border-blue-400 focus:bg-white'
                  }`}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />{errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">
                  Password
                </label>
                <a href="/forgot-password" className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full px-4 py-3 rounded-xl border text-[13.5px] outline-none transition-all pr-12
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
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />{errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl text-white font-bold text-[13.5px] transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)',
                boxShadow: '0 4px 18px rgba(37,99,235,0.28)',
              }}
            >
              {isLoggingIn
                ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                : 'Sign in to Console'
              }
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-300 mt-6">
            © 2026 Alyah Dental ERP · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
