import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Heart, CheckCircle2 } from 'lucide-react';
import StepClinicInfo from './steps/StepClinicInfo';
import StepOwnerDocs  from './steps/StepOwnerDocs';
import StepPlan       from './steps/StepPlan';
import StepPayment    from './steps/StepPayment';
import StepReview     from './steps/StepReview';
import { useRegisterClinic, useMockPayment } from '../../features/landing/hooks/useRegistration';

const STEPS = [
  { number: 1, title: 'Clinic Info',  description: 'Basic clinic details, location, and branch name.' },
  { number: 2, title: 'Owner & Docs', description: 'Owner identity, credentials, and compliance documents.' },
  { number: 3, title: 'Plan',         description: 'Choose a subscription plan and billing cycle.' },
  { number: 4, title: 'Payment',      description: 'Select your payment method.' },
  { number: 5, title: 'Review',       description: 'Review everything before submitting for approval.' },
];

export default function RegisterPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const registerClinic = useRegisterClinic();
  const mockPayment    = useMockPayment();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    // Step 1 — Clinic
    clinicName: '', branchName: '', phone: '',
    country: 'Ethiopia', city: 'Addis Ababa', address: '',
    clinicEmail: '',  
    // Step 2 — Owner/Admin
    ownerName: '', ownerEmail: '', ownerPhone: '',
    password: '', confirmPassword: '',
    tradeLicense: null, taxDocument: null,
    // Step 3 — Plan (pre-fill from URL if coming from pricing page)
    planId: searchParams.get('plan') || '',
    billing: searchParams.get('cycle') || 'monthly',
    // Step 4 — Payment
    paymentMethod: 'telebirr',
  });

  const updateFormData = (fields) => setFormData((prev) => ({ ...prev, ...fields }));
  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitError('');
    const isFree = formData.isFree === true || formData.planType === 'free';
    try {
      // ── Step 1: Register clinic + admin user + subscription ──────────────
      const step1Payload = {
        clinic_name:    formData.clinicName,
        clinic_email:   formData.clinicEmail,
        clinic_phone:   formData.phone,
        clinic_address: formData.address,
        clinic_city:    formData.city,
        clinic_country: formData.country,

        admin_name:                  formData.ownerName,
        admin_email:                 formData.ownerEmail,
        admin_phone:                 formData.ownerPhone || '',
        admin_password:              formData.password,
        admin_password_confirmation: formData.confirmPassword,

        plan_id:        parseInt(formData.planId),
        billing_cycle:  isFree ? 'trial' : formData.billing,
        // Free plans don't have a payment method
        payment_method: isFree ? 'none' : formData.paymentMethod,
      };

      const regResult = await registerClinic.mutateAsync(step1Payload);
      const clinicId  = regResult.data?.clinic?.id;

      if (!clinicId) throw new Error('Clinic ID missing from registration response.');

      // ── Step 2: Payment simulation — SKIP for free plans ────────────────
      if (!isFree) {
        const paymentPayload = {
          clinic_id:      clinicId,
          payment_method: formData.paymentMethod,
          ...(formData.paymentMethod === 'telebirr' && { phone_number: formData.phone }),
        };
        await mockPayment.mutateAsync(paymentPayload);
      }

      // ── Done ─────────────────────────────────────────────────────────────
      navigate('/pending-approval', {
        state: { clinicId, clinicName: formData.clinicName, isFree },
      });

    } catch (err) {
      const errData = err?.response?.data;
      const message = errData?.errors
        ? Object.values(errData.errors).flat().join(' ')
        : errData?.message || err.message || 'Submission failed. Please try again.';
      setSubmitError(message);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepClinicInfo data={formData} update={updateFormData} onNext={nextStep} />;
      case 2: return <StepOwnerDocs  data={formData} update={updateFormData} onNext={nextStep} onBack={prevStep} />;
      case 3: return <StepPlan       data={formData} update={updateFormData} onNext={nextStep} onBack={prevStep} />;
      case 4: return <StepPayment    data={formData} update={updateFormData} onNext={nextStep} onBack={prevStep} />;
      case 5: return (
        <StepReview
          data={formData}
          onSubmit={handleSubmit}
          onBack={prevStep}
          isSubmitting={registerClinic.isPending || mockPayment.isPending}
          submitError={submitError}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="flex w-full max-w-6xl min-h-[88vh] rounded-2xl overflow-hidden shadow-xl">

        {/* ── Left sidebar ── */}
        <div className="hidden md:flex flex-col w-[28%] bg-[#1a3a5c] p-6 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Alyah</p>
              <p className="text-[10px] font-semibold tracking-widest text-blue-300 uppercase">Dental ERP</p>
            </div>
          </Link>

          <div className="mb-6">
            <p className="text-[10px] font-bold tracking-widest text-blue-300 uppercase mb-2">Clinic Onboarding</p>
            <h2 className="text-base font-bold text-white leading-snug mb-2">
              Register through a real SaaS approval workflow.
            </h2>
            <p className="text-xs text-blue-200 leading-relaxed">
              Clinic profile, ownership, plan selection, payment, review — then pending approval before workspace access unlocks.
            </p>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            {STEPS.map((step) => {
              const isDone   = currentStep > step.number;
              const isActive = currentStep === step.number;
              return (
                <div
                  key={step.number}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-white/10 border border-white/20' : 'opacity-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isDone ? 'bg-green-500' : isActive ? 'bg-white' : 'bg-white/20'
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-3 h-3 text-white" />
                      : <span className={`text-[10px] font-bold ${isActive ? 'text-[#1F4E79]' : 'text-white'}`}>{step.number}</span>
                    }
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-blue-200'}`}>{step.title}</p>
                    {isActive && <p className="text-[10px] text-blue-300 mt-0.5 leading-relaxed">{step.description}</p>}
                  </div>
                </div>
              );
            })}
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 mt-1">
              <p className="text-[10px] text-blue-300">Step 6: Pending platform approval after submission.</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-blue-300 mt-1.5">{currentStep} of 5 steps</p>
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 bg-white flex flex-col overflow-y-auto">
          <div className="flex md:hidden items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-none">Alyah</p>
                <p className="text-[10px] font-semibold tracking-widest text-blue-600 uppercase">Dental ERP</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-0.5">Registration</p>
              <h1 className="text-xl font-bold text-gray-900">{STEPS[currentStep - 1].title}</h1>
            </div>
            <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {currentStep} / 5
            </span>
          </div>

          <div className="px-8 py-6 flex-1">
            {renderStep()}
          </div>
        </div>

      </div>
    </div>
  );
}