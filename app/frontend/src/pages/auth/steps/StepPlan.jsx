import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Clock, Zap, Building2, Crown } from 'lucide-react';
import { usePlans } from '../../../features/landing/hooks/usePlans';

const PLAN_ICONS = { free: Clock, starter: Zap, pro: Building2, enterprise: Crown };
const PLAN_COLORS = {
  free:       { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', text: '#15803d' },
  starter:    { bg: '#eff6ff', border: '#bfdbfe', badge: '#2563eb', text: '#1d4ed8' },
  pro:        { bg: '#f5f3ff', border: '#ddd6fe', badge: '#7c3aed', text: '#6d28d9' },
  enterprise: { bg: '#fff7ed', border: '#fed7aa', badge: '#d97706', text: '#b45309' },
};

export default function StepPlan({ data, update, onNext, onBack }) {
  const [billing,  setBilling]  = useState(data.billing || 'monthly');
  const [planId,   setPlanId]   = useState(data.planId  || null);

  const { data: pd, isLoading, isError } = usePlans();
  const plans = pd?.data || [];

  useEffect(() => {
    if (plans.length > 0 && !planId) {
      const pro = plans.find(p => p.slug === 'pro') || plans[0];
      setPlanId(String(pro.id));
    }
  }, [plans, planId]);

  const selected  = plans.find(p => String(p.id) === String(planId));
  const isFree    = selected?.type === 'free';

  const handleContinue = () => {
    if (!selected) return;
    update({
      planId:   String(selected.id),
      planName: selected.name,
      planType: selected.type,
      planPrice: isFree ? 0 : billing === 'monthly' ? +selected.monthly_price : +selected.annual_price,
      billing: isFree ? 'trial' : billing,
      isFree,
    });
    onNext();
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
    </div>
  );
  if (isError) return (
    <div className="text-center py-16 text-red-500 text-sm">Failed to load plans. Please refresh.</div>
  );

  return (
    <div className="space-y-5">

      {/* Billing toggle */}
      {!isFree && (
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-0.5">
            {['monthly', 'annual'].map(b => (
              <button key={b} type="button" onClick={() => setBilling(b)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                  billing === b ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">Save 17%</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map(plan => {
          const isSelected = String(plan.id) === String(planId);
          const isPopular  = plan.slug === 'pro';
          const planFree   = plan.type === 'free';
          const price      = planFree ? 0 : billing === 'monthly' ? plan.monthly_price : plan.annual_price;
          const color      = PLAN_COLORS[plan.slug] || PLAN_COLORS.pro;
          const Icon       = PLAN_ICONS[plan.slug] || Zap;
          const features   = Array.isArray(plan.features) ? plan.features : [];

          return (
            <div key={plan.id} onClick={() => setPlanId(String(plan.id))}
              className="relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: isSelected ? color.badge : '#e5e7eb',
                background:  isSelected ? color.bg : 'white',
                boxShadow:   isSelected ? `0 4px 20px ${color.badge}20` : '0 1px 4px rgba(0,0,0,0.04)',
              }}>

              {/* Popular badge */}
              {isPopular && !planFree && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full text-white"
                  style={{ background: color.badge }}>
                  ⭐ Popular
                </div>
              )}
              {planFree && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full text-white flex items-center gap-1"
                  style={{ background: '#16a34a' }}>
                  <Clock className="w-3 h-3" /> Free Trial
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: color.badge }} />
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? `border-[${color.badge}]` : 'border-gray-300'
                }`} style={{ borderColor: isSelected ? color.badge : '#d1d5db' }}>
                  {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: color.badge }} />}
                </div>
              </div>

              <h3 className="text-sm font-black text-gray-900 mb-1">{plan.name}</h3>

              {planFree ? (
                <div className="mb-3">
                  <p className="text-xl font-black text-gray-900">Free</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: color.text }}>
                    14-day trial · no credit card
                  </p>
                </div>
              ) : (
                <div className="mb-3">
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-black text-gray-900">ETB {Number(price).toLocaleString()}</span>
                    <span className="text-gray-400 text-xs pb-0.5">/mo</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 mb-3">
                {plan.max_users} users · {plan.max_branches} branch{plan.max_branches > 1 ? 'es' : ''} · {plan.max_storage_gb} GB
              </p>

              <ul className="space-y-1.5">
                {features.slice(0, 4).map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {features.length > 4 && (
                  <li className="text-[11px] text-gray-400 pl-4.5">+{features.length - 4} more features</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Selected summary */}
      {selected && (
        <div className="rounded-xl border px-5 py-3.5 flex items-center justify-between"
          style={{ background: isFree ? '#f0fdf4' : '#f8fafc', borderColor: isFree ? '#bbf7d0' : '#e2e8f0' }}>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {selected.name} plan selected
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isFree ? '14-day trial · no payment · auto-suspends after trial' : `Billed ${billing}`}
            </p>
          </div>
          <p className="text-sm font-black" style={{ color: isFree ? '#16a34a' : '#2563eb' }}>
            {isFree ? 'Free' : `ETB ${Number(billing === 'monthly' ? selected.monthly_price : selected.annual_price).toLocaleString()}/mo`}
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="px-6 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors font-medium">
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!selected}
          className="px-8 py-2.5 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
          {isFree ? 'Start Free Trial →' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
