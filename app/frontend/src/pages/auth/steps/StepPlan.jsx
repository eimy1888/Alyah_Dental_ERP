import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { usePlans } from '../../../features/landing/hooks/usePlans';

export default function StepPlan({ data, update, onNext, onBack }) {
  const [billing, setBilling]           = useState(data.billing || 'monthly');
  const [selectedPlanId, setSelectedPlanId] = useState(data.planId || null);

  const { data: plansData, isLoading, isError } = usePlans();
  const plans = plansData?.data || [];

  // If coming from pricing page with ?plan=id pre-selected, validate it exists
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      // default to pro slug if nothing pre-selected
      const proPlan = plans.find(p => p.slug === 'pro') || plans[0];
      setSelectedPlanId(String(proPlan.id));
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = plans.find(p => String(p.id) === String(selectedPlanId));

  const handleContinue = () => {
    if (!selectedPlan) return;

    update({
      planId:    String(selectedPlan.id),
      planName:  selectedPlan.name,
      planPrice: billing === 'monthly'
        ? Number(selectedPlan.monthly_price)
        : Number(selectedPlan.annual_price),
      billing,
    });
    onNext();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#1F4E79]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-24 text-red-500 text-sm">
        Failed to load plans. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Billing toggle */}
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

      {/* Plan cards — from database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isSelected = String(plan.id) === String(selectedPlanId);
          const isPopular  = plan.slug === 'pro';
          const price      = billing === 'monthly' ? plan.monthly_price : plan.annual_price;
          const features   = Array.isArray(plan.features) ? plan.features : [];

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(String(plan.id))}
              className={`relative rounded-2xl border p-6 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-[#1F4E79] bg-blue-50/50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1F4E79] text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </span>
              )}

              {/* Selection indicator */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-[#1F4E79]' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[#1F4E79]" />}
                </div>
              </div>

              <div className="flex items-end gap-1 mb-3">
                <span className="text-3xl font-black text-gray-900">
                  ${Number(price).toLocaleString()}
                </span>
                <span className="text-gray-400 text-sm mb-1">/month</span>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Up to {plan.max_users} users · {plan.max_branches} branch{plan.max_branches > 1 ? 'es' : ''} · {plan.max_storage_gb} GB
              </p>

              <ul className="space-y-2">
                {features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {features.length > 4 && (
                  <li className="text-xs text-gray-400 pl-5">+{features.length - 4} more features</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Selected plan summary */}
      {selectedPlan && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Selected: <span className="font-semibold text-gray-900">{selectedPlan.name}</span>
          </p>
          <p className="text-sm font-bold text-[#1F4E79]">
            ${Number(billing === 'monthly' ? selectedPlan.monthly_price : selectedPlan.annual_price).toLocaleString()}
            <span className="text-xs font-normal text-gray-400">/mo</span>
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
          Continue →
        </button>
      </div>
    </div>
  );
}