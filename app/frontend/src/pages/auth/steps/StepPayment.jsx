// cbe_birr removed — backend only accepts: telebirr, chapa, paypal, bank_transfer
import { CheckCircle2, Sparkles } from 'lucide-react';

const methods = [
  { key: 'telebirr',      label: 'Telebirr',       description: 'Pay via Telebirr mobile wallet' },
  { key: 'chapa',         label: 'Chapa',           description: 'Pay via Chapa payment gateway' },
  { key: 'paypal',        label: 'PayPal',          description: 'Pay via PayPal' },
  { key: 'bank_transfer', label: 'Bank Transfer',   description: 'Direct bank deposit' },
];

export default function StepPayment({ data, update, onNext, onBack }) {
  const selected  = data.paymentMethod || 'telebirr';
  const isFree    = data.isFree === true || data.planType === 'free';

  // Free plan — no payment needed, show trial confirmation
  if (isFree) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">No payment needed</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              You selected the <span className="font-semibold text-gray-700">{data.planName}</span> plan.
              Your <span className="font-bold text-emerald-700">14-day free trial</span> will start immediately after platform approval — no credit card required.
            </p>
          </div>
          <div className="w-full rounded-xl border border-emerald-200 bg-white divide-y divide-emerald-100">
            {[
              'Full access for 14 days',
              'No credit card required',
              'Cancel or upgrade anytime',
              'Trial ends automatically — no surprise charges',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all duration-200"
          >
            Continue to Review →
          </button>
        </div>
      </div>
    );
  }

  // Paid plan — show payment method selector
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Select your preferred payment method. The platform admin will confirm payment details during the approval process.
      </p>

      <div className="space-y-3">
        {methods.map((method) => (
          <div
            key={method.key}
            onClick={() => update({ paymentMethod: method.key })}
            className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
              selected === method.key
                ? 'border-[#1F4E79] bg-blue-50/50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selected === method.key ? 'border-[#1F4E79]' : 'border-gray-300'
            }`}>
              {selected === method.key && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F4E79]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{method.label}</p>
              <p className="text-xs text-gray-500">{method.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-xl bg-[#1F4E79] text-white font-semibold text-sm hover:bg-blue-900 transition-all duration-200"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}