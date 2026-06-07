import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

const billingLabels  = { monthly: 'Monthly billing', annual: 'Annual billing' };
const paymentLabels  = { telebirr: 'Telebirr', chapa: 'Chapa', paypal: 'PayPal', bank_transfer: 'Bank Transfer' };

export default function StepReview({ data, onSubmit, onBack, isSubmitting, submitError }) {
  // We show plan name from the stored plan object if available, else planId
  const planName    = data.planName  || data.planId || '—';
  const planPrice   = data.planPrice || '—';

  return (
    <div className="space-y-6">

      {/* Summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Clinic</p>
          <p className="text-base font-semibold text-gray-900">{data.clinicName || '—'}</p>
          <p className="text-sm text-gray-500">{data.clinicEmail}</p>
          <p className="text-sm text-gray-500">{data.city}, {data.country}</p>
          <p className="text-sm text-gray-500">{data.address}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Owner</p>
          <p className="text-base font-semibold text-gray-900">{data.ownerName || '—'}</p>
          <p className="text-sm text-gray-500">{data.ownerEmail}</p>
          {data.branchName && <p className="text-sm text-gray-500">{data.branchName}</p>}
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Subscription</p>
          <p className="text-base font-semibold text-gray-900">{planName}</p>
          <p className="text-sm text-gray-500">
            {billingLabels[data.billing] || data.billing}
            {planPrice !== '—' ? ` · $${planPrice}` : ''}
          </p>
          <p className="text-sm text-gray-500">
            Payment: {paymentLabels[data.paymentMethod] || data.paymentMethod}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Documents</p>
          <p className="text-sm text-gray-700">
            Trade license: {data.tradeLicense ? data.tradeLicense.name : 'Not uploaded'}
          </p>
          <p className="text-sm text-gray-700">
            Tax doc: {data.taxDocument ? data.taxDocument.name : 'Not uploaded'}
          </p>
        </div>
      </div>

      {/* Approval note */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-2">Approval Note</p>
        <p className="text-sm text-amber-700 leading-relaxed">
          Once submitted, the clinic enters pending platform approval. Workspace access and public showcase remain locked until a platform admin reviews and approves the registration.
        </p>
      </div>

      {/* Server error */}
      {submitError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 rounded-xl bg-[#1F4E79] text-white font-semibold text-sm hover:bg-blue-900 transition-all duration-200 flex items-center gap-2 disabled:opacity-60"
        >
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            : <><ShieldCheck className="w-4 h-4" /> Submit for Approval</>
          }
        </button>
      </div>
    </div>
  );
}