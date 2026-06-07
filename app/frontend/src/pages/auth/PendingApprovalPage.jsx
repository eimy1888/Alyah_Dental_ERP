import { useLocation, Link } from 'react-router-dom';
import { Heart, Clock, CheckCircle2, Circle } from 'lucide-react';

const planLabels = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
const billingLabels = { monthly: 'Monthly', annual: 'Annual' };
const paymentLabels = { telebirr: 'Telebirr', cbe_birr: 'CBE Birr', bank_transfer: 'Bank Transfer' };

const timelineSteps = [
  {
    title: 'Registration submitted',
    description: 'Clinic profile, ownership, and payment details received.',
    status: 'done',
  },
  {
    title: 'Document review',
    description: 'Platform admin verifies trade license and tax documents.',
    status: 'active',
  },
  {
    title: 'Subscription confirmed',
    description: 'Payment method and plan selection validated.',
    status: 'pending',
  },
  {
    title: 'Workspace unlocked',
    description: 'Full ERP access and public showcase activated.',
    status: 'pending',
  },
];

function TimelineStep({ step }) {
  return (
    <div className="flex items-start gap-4">
      {/* Indicator */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            step.status === 'done'
              ? 'bg-green-500'
              : step.status === 'active'
              ? 'bg-amber-400'
              : 'bg-gray-200'
          }`}
        >
          {step.status === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : step.status === 'active' ? (
            <Clock className="w-4 h-4 text-white" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-8">
        <p
          className={`text-sm font-semibold mb-0.5 ${
            step.status === 'done'
              ? 'text-green-600'
              : step.status === 'active'
              ? 'text-amber-600'
              : 'text-gray-400'
          }`}
        >
          {step.title}
        </p>
        <p className={`text-sm leading-relaxed ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-500'}`}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  const location = useLocation();
  const formData = location.state?.formData || {};

  const clinicName = formData.clinicName || 'Your clinic';
  const ownerName = formData.ownerName || '—';
  const plan = planLabels[formData.plan] || 'Pro';
  const billing = billingLabels[formData.billing] || 'Monthly';
  const payment = paymentLabels[formData.paymentMethod] || 'Telebirr';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Logo bar */}
      <div className="flex justify-center pt-8 pb-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 leading-none">Alyah</p>
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">Dental ERP</p>
          </div>
        </Link>
      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Hero banner */}
          <div className="bg-gradient-to-br from-[#1F4E79] to-blue-600 px-8 py-14 text-center text-white">
            {/* Clock icon */}
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-amber-300" />
            </div>

            {/* Badge */}
            <span className="inline-block px-4 py-1.5 rounded-full border border-amber-300 text-amber-300 text-xs font-semibold tracking-widest uppercase mb-5">
              Pending Platform Approval
            </span>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {clinicName} is under review.
            </h1>
            <p className="text-white/80 max-w-md mx-auto text-sm leading-relaxed">
              Registration completed successfully. Access remains locked until a platform admin approves the tenant and confirms subscription details.
            </p>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">

            {/* Timeline */}
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-6">
                Approval Timeline
              </p>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-0">
                  {timelineSteps.map((step, i) => (
                    <TimelineStep key={i} step={step} />
                  ))}
                </div>
              </div>
            </div>

            {/* Submitted summary */}
            <div className="space-y-4">
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                Submitted Summary
              </p>

              {/* Registration details card */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 text-blue-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-blue-700">Registration details</p>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: 'Clinic', value: clinicName },
                    { label: 'Owner', value: ownerName },
                    { label: 'Plan', value: plan },
                    { label: 'Billing', value: billing },
                    { label: 'Payment', value: payment },
                    { label: 'Status', value: 'Pending Approval' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className={`text-sm font-semibold ${label === 'Status' ? 'text-amber-600' : 'text-gray-900'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What happens next */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✉️</span>
                  <p className="text-sm font-semibold text-gray-800">What happens next?</p>
                </div>
                <ul className="space-y-2">
                  {[
                    'You will receive an email when the review is complete.',
                    'The platform admin may request additional documents.',
                    'Once approved, your workspace and showcase activate immediately.',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 px-8 py-6 flex items-center justify-center gap-4">
            <Link
              to="/"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Back to Landing
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Go to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}