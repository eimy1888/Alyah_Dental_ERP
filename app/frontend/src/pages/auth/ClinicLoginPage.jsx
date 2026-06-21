import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Calendar, ClipboardList, HeartPulse, Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getClinicProfile } from '../../services/publicService';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password required'),
});

const BENEFITS = [
  { icon: Calendar,     title: 'Easy Appointments',    desc: 'Book and manage appointments effortlessly' },
  { icon: ClipboardList,title: 'Digital Records',      desc: 'Access your complete medical history anytime' },
  { icon: HeartPulse,   title: 'Treatment Tracking',   desc: 'Follow your treatment journey in real time' },
  { icon: Star,         title: 'Expert Care',          desc: 'Trusted dentists and modern technology' },
];

export default function ClinicLoginPage() {
  const { slug } = useParams();
  const [showPw, setShowPw] = useState(false);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const { login, isLoggingIn, loginError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    getClinicProfile(slug)
      .then(setClinic)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const clinicName = loading ? 'Alyah Dental' : (clinic?.name || 'Dental Clinic');

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#f8fafc' }}>

      {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(155deg,#1e3a8a 0%,#2563eb 45%,#0284c7 100%)' }}>

        {/* Noise + dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Orbs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 65%)' }} />
        <div className="absolute -bottom-32 -left-16 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 65%)' }} />

        {/* Logo */}
        <div className="relative z-10 px-10 pt-8 pb-4 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none">{clinicName}</p>
            <p className="text-[9px] font-bold tracking-[0.2em] text-blue-200 uppercase">Patient Portal</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-10 pb-10">
          <h1 className="text-[2.4rem] font-black text-white leading-[1.1] tracking-tight mb-4">
            Your dental health<br />
            <span className="text-blue-200">starts here.</span>
          </h1>
          <p className="text-[13px] text-blue-100/70 leading-relaxed max-w-xs mb-8">
            Sign in to access your appointments, treatment plans, prescriptions, and complete dental records in one place.
          </p>

          {/* Benefit cards */}
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="rounded-2xl p-4 border border-white/10 backdrop-blur-sm hover:bg-white/8 transition-all"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center mb-2.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-[11px] font-bold text-white leading-snug mb-0.5">{title}</p>
                <p className="text-[10px] text-blue-200/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-6 rounded-2xl p-4 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-[11px] text-blue-100/80 leading-relaxed italic">
              "Managing my dental care has never been easier. I can see my entire treatment history with just one click."
            </p>
            <p className="text-[10px] text-blue-300/60 mt-2 font-semibold">— Mikiyas T., Patient</p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — form ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">

        {/* Mobile header */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)' }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
            </svg>
          </div>
          <p className="font-black text-gray-900 text-lg">{clinicName}</p>
          <p className="text-xs text-gray-400">Patient Portal</p>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-50">
              <h2 className="text-xl font-black text-gray-900">Sign in</h2>
              <p className="text-[12.5px] text-gray-400 mt-1">
                Access your account at <span className="font-semibold text-gray-600">{clinicName}</span>
              </p>
            </div>

            {/* Form body */}
            <div className="px-8 py-6">
              {loginError && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(login)} className="space-y-4">

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">
                    Email address
                  </label>
                  <input type="email" placeholder="you@email.com" autoComplete="email"
                    {...register('email')}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/10 ${
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
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.12em]">Password</label>
                    <Link to="/forgot-password" className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                      {...register('password')}
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/10 ${
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
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#0284c7 100%)', boxShadow: '0 4px 20px rgba(37,99,235,0.28)' }}>
                  {isLoggingIn ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : 'Sign In'}
                </button>
              </form>
            </div>
          </div>

          {/* Footer links */}
          <div className="text-center mt-5 space-y-2">
            <p className="text-[12px] text-gray-400">
              Not a patient yet?{' '}
              <a href={`/clinic/${slug}`} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Visit our website →
              </a>
            </p>
            <p className="text-[11px] text-gray-300">
              © 2026 {clinicName} · Powered by Alyah Dental ERP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
