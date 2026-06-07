import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import { getClinicProfile } from '../../services/publicService';

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Valid phone number required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export default function ClinicRegisterPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [clinicProfile, setClinicProfile] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    const loadClinic = async () => {
      if (!slug) return;
      try {
        const data = await getClinicProfile(slug);
        setClinicProfile(data);
      } catch (error) {
        console.error('Failed to load clinic profile:', error);
      } finally {
        setLoadingClinic(false);
      }
    };
    loadClinic();
  }, [slug]);

  const onSubmit = async (data) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/patient-register', {
        name: data.full_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      if (response.data.success) {
        setRegistrationSuccess(true);
      }
    } catch (error) {
      setServerError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Now login with your email and password to book appointments and manage your dental care.
          </p>
          <Link
            to={`/clinic/${slug}/login`}
            className="w-full inline-block py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all"
          >
            Go to Login
          </Link>
          <p className="text-center text-sm text-gray-500 mt-4">
            <Link to={`/clinic/${slug}`} className="text-blue-600 hover:text-blue-700">
              ← Back to Clinic Website
            </Link>
          </p>
        </div>
      </div>
    );
  }

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
            Join thousands of patients who trust {clinicProfile?.name || 'us'} for healthier, brighter smiles.
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

      {/* Right Section - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {loadingClinic ? 'Dental Clinic' : clinicProfile?.name || 'Dental Clinic'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create your account</p>
          </div>

          {/* Error Message */}
          {serverError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                {...register('full_name')}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                  errors.full_name
                    ? 'border-red-300 focus:border-red-400 bg-red-50'
                    : 'border-gray-200 focus:border-blue-400 bg-white'
                }`}
              />
              {errors.full_name && (
                <p className="mt-1.5 text-xs text-red-500">{errors.full_name.message}</p>
              )}
            </div>

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

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                {...register('phone')}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                  errors.phone
                    ? 'border-red-300 focus:border-red-400 bg-red-50'
                    : 'border-gray-200 focus:border-blue-400 bg-white'
                }`}
              />
              {errors.phone && (
                <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>
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
                  placeholder="Create a password"
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
              <p className="mt-1 text-xs text-gray-400">Must be at least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  {...register('confirm_password')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors pr-11 ${
                    errors.confirm_password
                      ? 'border-red-300 focus:border-red-400 bg-red-50'
                      : 'border-gray-200 focus:border-blue-400 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                {...register('terms')}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-600">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs text-red-500">{errors.terms.message}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to={`/clinic/${slug}/login`} className="text-blue-600 font-semibold hover:text-blue-700">
              Sign in
            </Link>
          </p>

          {/* Back to Clinic Link */}
          <p className="text-center text-sm text-gray-500 mt-4">
            <Link to={`/clinic/${slug}`} className="text-blue-600 hover:text-blue-700">
              ← Back to {clinicProfile?.name || 'Clinic'} Website
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} {loadingClinic ? 'Dental Clinic' : clinicProfile?.name || 'Dental Clinic'}
          </p>
        </div>
      </div>
    </div>
  );
}