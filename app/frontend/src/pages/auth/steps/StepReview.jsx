import { ShieldCheck, Loader2, AlertCircle, Sparkles, Building2, User, Star, FileText } from 'lucide-react';

const billingLabels = { monthly: 'Monthly billing', annual: 'Annual billing', trial: '14-day free trial' };
const paymentLabels = { telebirr: 'Telebirr', chapa: 'Chapa', paypal: 'PayPal', bank_transfer: 'Bank Transfer', none: 'No payment required' };

function ReviewCard({ icon: Icon, title, color = '#2563eb', children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function StepReview({ data, onSubmit, onBack, isSubmitting, submitError }) {
  const isFree = data.isFree === true || data.planType === 'free';

  return (
    <div className="space-y-5">

      {/* Trial banner */}
      {isFree && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-black text-emerald-800">14-Day Free Trial Selected</p>
            <p className="text-[12px] text-emerald-600 mt-0.5">Full access for 14 days after approval · auto-suspends · no credit card</p>
          </div>
        </div>
      )}

      {/* Review grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReviewCard icon={Building2} title="Clinic Details" color="#2563eb">
          <p className="text-sm font-bold text-gray-900">{data.clinicName || '—'}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{data.clinicEmail}</p>
          <p className="text-[12px] text-gray-500">{data.branchName && `Branch: ${data.branchName}`}</p>
          <p className="text-[12px] text-gray-500">{data.city}, {data.country}</p>
        </ReviewCard>

        <ReviewCard icon={User} title="Owner / Admin" color="#7c3aed">
          <p className="text-sm font-bold text-gray-900">{data.ownerName || '—'}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{data.ownerEmail}</p>
          {data.ownerPhone && <p className="text-[12px] text-gray-500">{data.ownerPhone}</p>}
          <p className="text-[12px] text-green-600 font-semibold mt-1">✓ Password set</p>
        </ReviewCard>

        <ReviewCard icon={Star} title="Subscription" color={isFree ? '#16a34a' : '#f59e0b'}>
          <p className="text-sm font-bold text-gray-900">{data.planName || '—'}</p>
          <p className="text-[12px] mt-0.5 font-semibold" style={{ color: isFree ? '#16a34a' : '#2563eb' }}>
            {isFree ? 'Free trial · 14 days' : billingLabels[data.billing] || data.billing}
          </p>
          {!isFree && (
            <p className="text-[12px] text-gray-500 mt-0.5">
              ETB {Number(data.planPrice || 0).toLocaleString()}/mo · {paymentLabels[data.paymentMethod] || '—'}
            </p>
          )}
        </ReviewCard>

        <ReviewCard icon={FileText} title="Documents" color="#64748b">
          <div className="space-y-1.5">
            {[['Trade License', data.tradeLicense], ['Tax Document', data.taxDocument]].map(([label, file]) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${file ? 'bg-green-500' : 'bg-gray-200'}`} />
                <span className="text-[12px] text-gray-500">{label}: </span>
                <span className={`text-[12px] font-medium ${file ? 'text-green-600' : 'text-gray-400'}`}>
                  {file ? file.name : 'Not uploaded'}
                </span>
              </div>
            ))}
          </div>
        </ReviewCard>
      </div>

      {/* Approval notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
          ⏳ What happens next?
        </p>
        <p className="text-[12.5px] text-amber-700 leading-relaxed">
          Your registration will be reviewed by a platform administrator. You'll receive an email with login credentials once your clinic is approved and activated.
          {isFree && ' Your 14-day trial begins from the approval date.'}
        </p>
      </div>

      {/* Error */}
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
          ← Back
        </button>
        <button onClick={onSubmit} disabled={isSubmitting}
          className="px-8 py-2.5 rounded-xl text-white font-bold text-sm transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
          style={{
            background: isFree ? 'linear-gradient(135deg,#15803d,#16a34a)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            boxShadow: isFree ? '0 4px 16px rgba(22,163,74,0.25)' : '0 4px 16px rgba(37,99,235,0.25)',
          }}>
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
            : <><ShieldCheck className="w-4 h-4" />{isFree ? 'Start Free Trial' : 'Submit for Approval'}</>
          }
        </button>
      </div>
    </div>
  );
}
