import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Clock } from 'lucide-react';
import { usePlans } from '../../../features/landing/hooks/usePlans';

export default function StepPlan({ data, update, onNext, onBack }) {
  const [billing, setBilling]               = useState(data.billing || 'monthly');
  const [selectedPlanId, setSelectedPlanId] = useState(data.planId || null);

  const { data: plansData, isLoading, isError } = usePlans();
  const plans = plansData?.data || [];

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const proPlan = plans.find(p => p.slug === 'pro') || plans[0];
      setSelectedPlanId(String(proPlan.id));
    }
  }, [plans, selectedPlanId]);

  const selectedPlan   = plans.find(p => String(p.id) === String(selectedPlanId));
  const isFreeSelected = selectedPlan?.type === 'free';

  const handleContinue = () => {
    if (!selectedPlan) return;
    update({
      planId:    String(selectedPlan.id),
      planName:  selectedPlan.name,
      planType:  selectedPlan.type,
      planPrice: isFreeSelected ? 0 : (
        billing === 'monthly'
          ? Number(selectedPlan.monthly_price)
          : Number(selectedPlan.annual_price)
      ),
      billing: isFreeSelected ? 'trial' : billing,
      isFree:  isFreeSelected,
    });
    onNext();
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-[#1F4E79]" />
    </div>
  );

  if (isError) return (
    <div className="text-center py-24 text-red-500 text-sm">
      Failed to load plans. Please refresh the page.
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Billing toggle — only for paid plans */}
      {!isFreeSelected && (
        <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-1">
          {['monthly', 'annual'].map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 capitalize flex items-center gap-2 ${
                billing === b ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual'}
              {b === 'annual' && (
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  Save 17%
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isSelected = String(plan.id) === String(selectedPlanId);
          const isPopular  = plan.slug === 'pro';
          const isPlanFree = plan.type === 'free';
          const price      = isPlanFree ? 0 : (billing === 'monthly' ? plan.monthly_price : plan.annual_price);
          const features   = Array.isArray(plan.features) ? plan.features : [];

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(String(plan.id))}
              className={`relative rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-[#1F4E79] bg-blue-50/50 shadow-md ring-1 ring-[#1F4E79]/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {isPopular && !isPlanFree && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1F4E79] text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </span>
              )}

              {isPlanFree && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 14-Day Free Trial
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-[#1F4E79]' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[#1F4E79]" />}
                </div>
              </div>

              {isPlanFree ? (
                <div className="mb-3">
                  <p className="text-2xl font-black text-gray-900">Free</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">14 days · no credit card · auto-suspends after</p>
                </div>
              ) : (
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-2xl font-black text-gray-900">
                    ETB {Number(price).toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-xs mb-1">/mo</span>
                </div>
              )}

              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {plan.max_users} users · {plan.max_branches} branch{plan.max_branches > 1 ? 'es' : ''} · {plan.max_storage_gb} GB
              </p>

              <ul className="space-y-1.5">
                {features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {features.length > 4 && (
                  <li className="text-xs text-gray-400 pl-5">+{features.length - 4} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Selected plan summary */}
      {selectedPlan && (
        <div
          className="rounded-xl border px-5 py-3 flex items-center justify-between"
          style={{
            background:   isFreeSelected ? '#f0fdf4' : '#f8fafc',
            borderColor:  isFreeSelected ? '#bbf7d0' : '#e2e8f0',
          }}
        >
          <div>
            <p className="text-sm text-gray-600">
              Selected: <span className="font-semibold text-gray-900">{selectedPlan.name}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isFreeSelected
                ? '14-day trial · no payment required · auto-suspends after 14 days'
                : `Billed ${billing}`}
            </p>
          </div>
          <p className="text-sm font-bold" style={{ color: isFreeSelected ? '#16a34a' : '#1F4E79' }}>
            {isFreeSelected
              ? 'Free'
              : `ETB ${Number(billing === 'monthly' ? selectedPlan.monthly_price : selectedPlan.annual_price).toLocaleString()}/mo`}
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedPlan}
          className="px-8 py-3 rounded-xl bg-[#1F4E79] text-white font-semibold text-sm hover:bg-blue-900 transition-all duration-200 disabled:opacity-50"
        >
          {isFreeSelected ? 'Start Free Trial →' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
