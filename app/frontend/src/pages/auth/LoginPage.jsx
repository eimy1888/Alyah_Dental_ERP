import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const STATS = [
  { value: '126+',   label: 'Clinics' },
  { value: '99.9%',  label: 'Uptime' },
  { value: '8',      label: 'Roles' },
  { value: '24/7',   label: 'Support' },
];

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const { login, isLoggingIn, loginError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ══ LEFT — dark hero ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060d1a 0%, #0f2744 40%, #0a1628 100%)' }}>

        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(37,99,235,0.15) 0%,transparent 65%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 65%)', filter: 'blur(50px)' }} />

        {/* Top bar */}
        <div className="relative z-10 px-10 pt-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)' }}>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">Alyah</p>
              <p className="text-[9px] font-bold tracking-[0.2em] text-blue-300 uppercase">Dental ERP</p>
            </div>
          </div>
        </div>

        {/* Main hero content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-10 pb-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-blue-300 bg-blue-900/40 border border-blue-700/40 rounded-full px-3 py-1.5 w-fit mb-6">
            <Sparkles className="w-3 h-3" />
            Platform Administration
          </div>

          <h1 className="text-[2.6rem] font-black text-white leading-[1.1] tracking-tight mb-4">
            The operating<br />
            <span style={{ background: 'linear-gradient(135deg,#60a5fa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              system for modern
            </span><br />
            dentistry.
          </h1>

          <p className="text-[13px] text-blue-200/70 leading-relaxed max-w-xs mb-8">
            Full oversight of every clinic, subscription, staff, and billing workflow — all in one unified console.
          </p>

          {/* Feature list */}
          <div className="space-y-3 mb-8">
            {[
              { color: '#3b82f6', label: 'Multi-clinic SaaS management' },
              { color: '#06b6d4', label: 'Real-time billing & subscription control' },
              { color: '#8b5cf6', label: 'Complete audit trail & compliance logs' },
              { color: '#10b981', label: 'Role-based access for 8 actor types' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[12px] text-blue-100/70">{label}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 pt-6 border-t border-white/8">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-[9px] font-bold tracking-wider text-blue-300/60 uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="relative z-10 px-10 py-4 border-t border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">All systems operational</span>
          </div>
          <span className="text-[10px] text-blue-400/50">v2.0 · 2026</span>
        </div>
      </div>

      {/* ══ RIGHT — form ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)' }}>
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-black text-gray-900 leading-none">Alyah</p>
            <p className="text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase">Dental ERP</p>
          </div>
        </div>

        <div className="w-full max-w-[380px]">

          {/* Header */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.18em] uppercase text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
              <ShieldCheck className="w-3 h-3" />
              Secured Access
            </div>
            <h2 className="text-[1.75rem] font-black text-gray-900 leading-tight tracking-tight">
              Welcome back
            </h2>
            <p className="text-[13px] text-gray-400 mt-1.5">
              Sign in to the Alyah administration console
            </p>
          </div>

          {/* Error */}
          {loginError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(d => login(d, { requireRole: 'platform_admin' }))} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">
                Email address
              </label>
              <input type="email" placeholder="admin@alyahdental.com" autoComplete="email"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/12 ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/60 focus:border-blue-400 focus:bg-white'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Password</label>
                <Link to="/forgot-password" className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/12 ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/60 focus:border-blue-400 focus:bg-white'
                  }`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoggingIn}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#0284c7 100%)', boxShadow: '0 4px 20px rgba(37,99,235,0.30)' }}>
              {isLoggingIn ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : 'Sign in to Console'}
            </button>
          </form>

          {/* Register CTA */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-[12px] text-gray-400">
              Want to register your clinic?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Start here →
              </Link>
            </p>
          </div>

          <p className="text-center text-[10px] text-gray-300 mt-5">
            © 2026 Alyah Dental ERP · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
