import { CheckCircle2, Sparkles, Smartphone, Globe, CreditCard, Building } from 'lucide-react';

const METHODS = [
  { key: 'telebirr',      label: 'Telebirr',        desc: 'Pay via Telebirr mobile wallet',       icon: Smartphone, color: '#00a651' },
  { key: 'chapa',         label: 'Chapa',            desc: 'Pay via Chapa payment gateway',        icon: Globe,      color: '#6366f1' },
  { key: 'paypal',        label: 'PayPal',           desc: 'Pay via PayPal international',         icon: CreditCard, color: '#0070ba' },
  { key: 'bank_transfer', label: 'Bank Transfer',    desc: 'Direct bank deposit (Commercial Bank)', icon: Building,   color: '#64748b' },
];

const FREE_FEATURES = [
  'Full feature access for 14 days',
  'No credit card required',
  'Upgrade anytime during trial',
  'Trial ends automatically — zero surprise charges',
];

export default function StepPayment({ data, update, onNext, onBack }) {
  const selected = data.paymentMethod || 'telebirr';
  const isFree   = data.isFree === true || data.planType === 'free';

  if (isFree) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border-2 border-emerald-200 p-6 flex flex-col items-center text-center gap-4"
          style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">No payment needed!</h3>
            <p className="text-[13px] text-gray-500 mt-1.5 max-w-sm leading-relaxed">
              You selected the <span className="font-bold text-gray-700">{data.planName}</span> plan.
              Your <span className="font-black text-emerald-700">14-day free trial</span> activates immediately after platform approval.
            </p>
          </div>
          <div className="w-full rounded-xl border border-emerald-200 bg-white overflow-hidden">
            {FREE_FEATURES.map((f, i) => (
              <div key={f} className={`flex items-center gap-3 px-4 py-3 ${i < FREE_FEATURES.length - 1 ? 'border-b border-emerald-50' : ''}`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[12.5px] text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-1">
          <button type="button" onClick={onBack}
            className="px-6 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors font-medium">
            ← Back
          </button>
          <button type="button" onClick={onNext}
            className="px-8 py-2.5 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', boxShadow: '0 4px 16px rgba(22,163,74,0.25)' }}>
            Continue to Review →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-gray-400 leading-relaxed">
        Select your preferred payment method. The platform administrator will verify and confirm your payment during the approval process.
      </p>

      <div className="space-y-2.5">
        {METHODS.map(({ key, label, desc, icon: Icon, color }) => (
          <div key={key} onClick={() => update({ paymentMethod: key })}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
              selected === key ? 'shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            style={selected === key ? { borderColor: color, background: `${color}08` } : {}}>

            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-[11px] text-gray-400">{desc}</p>
            </div>

            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all`}
              style={{ borderColor: selected === key ? color : '#d1d5db' }}>
              {selected === key && <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
            </div>
          </div>
        ))}
      </div>

      {/* Amount due */}
      <div className="rounded-xl border border-blue-100 px-5 py-3.5 bg-blue-50/40 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{data.planName} · {data.billing}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Amount due upon platform approval
          </p>
        </div>
        <p className="text-base font-black text-blue-600">
          ETB {Number(data.planPrice || 0).toLocaleString()}
        </p>
      </div>

      <div className="flex justify-between pt-1">
        <button type="button" onClick={onBack}
          className="px-6 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors font-medium">
          ← Back
        </button>
        <button type="button" onClick={onNext}
          className="px-8 py-2.5 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
          Continue →
        </button>
      </div>
    </div>
  );
}
