import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getClinicProfile } from '../../services/publicService';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function ClinicLoginPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [showPassword, setShowPassword]   = useState(false);
  const [clinicProfile, setClinicProfile] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const { login, isLoggingIn, loginError } = useAuth();

  // â”€â”€ Load clinic branding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!slug) return;
    const loadClinic = async () => {
      try {
        const data = await getClinicProfile(slug);
        setClinicProfile(data);
      } catch (err) {
        console.error('Failed to load clinic profile:', err);
      } finally {
        setLoadingClinic(false);
      }
    };
    loadClinic();
  }, [slug]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    await login(data); // No requireRole â€” any clinic role is allowed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex">

      {/* Left Section - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-center px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Start your journey<br />to a perfect smile
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of patients who trust Alyah Dental ERP for healthier, brighter smiles.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Personalized care</p>
                <p className="text-blue-100 text-sm">Treatment plans tailored to your smile.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Trusted experts</p>
                <p className="text-blue-100 text-sm">Board-certified dentists & hygienists.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Modern technology</p>
                <p className="text-blue-100 text-sm">Painless, precise digital dentistry.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-blue-200 text-sm">
              <span className="text-2xl font-bold text-white">15,000+</span> happy patients
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Clinic branding */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {loadingClinic ? 'Alyah Dental ERP' : clinicProfile?.name || 'Dental Clinic'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>

          {/* Error */}
          {loginError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                  errors.email
                    ? 'border-red-300 focus:border-red-400 bg-red-50'
                    : 'border-gray-200 focus:border-blue-400 bg-white'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors pr-11 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-400 bg-red-50'
                      : 'border-gray-200 focus:border-blue-400 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          {/* REMOVED: Sign up / Create account link - Online registration disabled */}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Â© 2026 {loadingClinic ? 'Alyah Dental ERP' : clinicProfile?.name || 'Dental Clinic'}
          </p>

        </div>
      </div>
    </div>
  );
}
