import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Sparkles, Shield, Clock } from 'lucide-react';
import StepClinicInfo from './steps/StepClinicInfo';
import StepOwnerDocs  from './steps/StepOwnerDocs';
import StepPlan       from './steps/StepPlan';
import StepPayment    from './steps/StepPayment';
import StepReview     from './steps/StepReview';
import { useRegisterClinic, useMockPayment } from '../../features/landing/hooks/useRegistration';

const STEPS = [
  { number: 1, label: 'Clinic Info',   icon: '🏥', desc: 'Basic clinic and branch details' },
  { number: 2, label: 'Owner Info',    icon: '👤', desc: 'Account owner credentials' },
  { number: 3, label: 'Choose Plan',   icon: '⭐', desc: 'Subscription plan selection' },
  { number: 4, label: 'Payment',       icon: '💳', desc: 'Payment method' },
  { number: 5, label: 'Review',        icon: '✅', desc: 'Final confirmation' },
];

const TRUST_BADGES = [
  { icon: Shield, text: 'Bank-grade security' },
  { icon: Clock,  text: 'Setup in 5 minutes' },
  { icon: Sparkles, text: 'Free 14-day trial' },
];

export default function RegisterPage() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const registerClinic = useRegisterClinic();
  const mockPayment    = useMockPayment();
  const contentRef     = useRef(null);

  const [step,        setStep]        = useState(1);
  const [submitError, setSubmitError] = useState('');
  const [formData,    setFormData]    = useState({
    clinicName: '', branchName: '', phone: '', country: 'Ethiopia',
    city: 'Addis Ababa', address: '', clinicEmail: '',
    ownerName: '', ownerEmail: '', ownerPhone: '', password: '', confirmPassword: '',
    tradeLicense: null, taxDocument: null,
    planId:   params.get('plan')  || '',
    billing:  params.get('cycle') || 'monthly',
    paymentMethod: 'telebirr',
  });

  const update  = (fields) => setFormData(p => ({ ...p, ...fields }));
  const next    = () => { setStep(s => Math.min(s + 1, 5)); scrollTop(); };
  const back    = () => { setStep(s => Math.max(s - 1, 1)); scrollTop(); };
  const scrollTop = () => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSubmit = async () => {
    setSubmitError('');
    const isFree = formData.isFree === true || formData.planType === 'free';
    try {
      const res = await registerClinic.mutateAsync({
        clinic_name: formData.clinicName, clinic_email: formData.clinicEmail,
        clinic_phone: formData.phone, clinic_address: formData.address,
        clinic_city: formData.city, clinic_country: formData.country,
        admin_name: formData.ownerName, admin_email: formData.ownerEmail,
        admin_phone: formData.ownerPhone || '',
        admin_password: formData.password,
        admin_password_confirmation: formData.confirmPassword,
        plan_id: parseInt(formData.planId),
        billing_cycle: isFree ? 'trial' : formData.billing,
        payment_method: isFree ? 'none' : formData.paymentMethod,
      });

      const clinicId = res.data?.clinic?.id;
      if (!clinicId) throw new Error('Clinic ID missing from registration response.');

      if (!isFree) {
        await mockPayment.mutateAsync({
          clinic_id: clinicId,
          payment_method: formData.paymentMethod,
          ...(formData.paymentMethod === 'telebirr' && { phone_number: formData.phone }),
        });
      }

      navigate('/pending-approval', { state: { clinicId, clinicName: formData.clinicName, isFree } });
    } catch (err) {
      const d = err?.response?.data;
      const msg = d?.errors ? Object.values(d.errors).flat().join(' ') : d?.message || err.message || 'Submission failed. Try again.';
      setSubmitError(msg);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepClinicInfo data={formData} update={update} onNext={next} />;
      case 2: return <StepOwnerDocs  data={formData} update={update} onNext={next} onBack={back} />;
      case 3: return <StepPlan       data={formData} update={update} onNext={next} onBack={back} />;
      case 4: return <StepPayment    data={formData} update={update} onNext={next} onBack={back} />;
      case 5: return (
        <StepReview data={formData} onSubmit={handleSubmit} onBack={back}
          isSubmitting={registerClinic.isPending || mockPayment.isPending}
          submitError={submitError} />
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#f0f4f8' }}>

      {/* ══ LEFT SIDEBAR ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col w-[300px] xl:w-[320px] shrink-0"
        style={{ background: 'linear-gradient(170deg,#060d1a 0%,#0f2744 50%,#0a1628 100%)' }}>

        {/* Pattern */}
        <div className="absolute inset-0 w-[300px] xl:w-[320px] pointer-events-none overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Logo */}
        <div className="relative z-10 px-7 pt-7 pb-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)' }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">Alyah</p>
              <p className="text-[9px] font-bold tracking-[0.2em] text-blue-300 uppercase">Dental ERP</p>
            </div>
          </Link>
        </div>

        {/* Title */}
        <div className="relative z-10 px-7 pb-6 border-b border-white/6">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 mb-1.5">Clinic Onboarding</p>
          <h2 className="text-base font-black text-white leading-snug">
            Register your clinic on the platform
          </h2>
          <p className="text-[11px] text-blue-200/50 mt-1.5 leading-relaxed">
            Complete all steps to get your clinic workspace approved and activated.
          </p>
        </div>

        {/* Step list */}
        <div className="relative z-10 flex-1 px-5 py-5 overflow-y-auto">
          <div className="space-y-1.5">
            {STEPS.map((s) => {
              const isDone   = step > s.number;
              const isActive = step === s.number;
              return (
                <div key={s.number}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-white/10 border border-white/15' : isDone ? 'opacity-80' : 'opacity-40'
                  }`}>

                  {/* Step indicator */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-all ${
                    isDone   ? 'bg-emerald-500' :
                    isActive ? 'bg-white text-gray-900' :
                               'bg-white/10 text-white/60'
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : isActive ? s.number : s.number}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-none ${isActive ? 'text-white' : isDone ? 'text-white/80' : 'text-white/40'}`}>
                      {s.icon} {s.label}
                    </p>
                    {isActive && (
                      <p className="text-[10px] text-blue-200/50 mt-0.5 leading-tight">{s.desc}</p>
                    )}
                  </div>

                  {isDone && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </div>
              );
            })}
            {/* Final step */}
            <div className={`flex items-center gap-3 px-3 py-3 rounded-xl ${step > 5 ? 'bg-emerald-900/30 border border-emerald-500/20' : 'opacity-30'}`}>
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white/40 text-xs font-black">6</div>
              <div>
                <p className="text-xs font-bold text-white/40">⏳ Pending Approval</p>
                <p className="text-[10px] text-blue-200/30 mt-0.5">Platform admin reviews & activates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 px-7 pb-7 pt-4 border-t border-white/6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-blue-300/60 font-semibold">Progress</span>
            <span className="text-[10px] text-blue-300 font-black">{Math.round((step / 5) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(step / 5) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#06b6d4)' }} />
          </div>
          <p className="text-[10px] text-blue-300/40 mt-2">Step {step} of 5</p>
        </div>
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top bar */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={back}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <div className="hidden md:block">
              <p className="text-xs text-gray-400">Step {step} of 5</p>
              <p className="text-sm font-bold text-gray-800">{STEPS[step - 1]?.label}</p>
            </div>
          </div>

          {/* Mobile progress */}
          <div className="flex items-center gap-2 md:hidden">
            {STEPS.map(s => (
              <div key={s.number}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step > s.number ? 'w-6 bg-emerald-500' :
                  step === s.number ? 'w-8 bg-blue-500' : 'w-4 bg-gray-200'
                }`} />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Trust badges */}
            <div className="hidden xl:flex items-center gap-3">
              {TRUST_BADGES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <Icon className="w-3 h-3 text-blue-400" />
                  {text}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              Already registered?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">Sign in</Link>
            </span>
          </div>
        </div>

        {/* Step content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Step header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{STEPS[step - 1]?.icon}</span>
                <span className="inline-flex items-center text-[10px] font-bold tracking-[0.15em] uppercase text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  Step {step} of 5
                </span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                {STEPS[step - 1]?.label}
              </h1>
              <p className="text-[13px] text-gray-400 mt-1">{STEPS[step - 1]?.desc}</p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-7 py-7">
                {renderStep()}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center text-[11px] text-gray-300 mt-5">
              🔒 Your information is encrypted and secure · © 2026 Alyah Dental ERP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
