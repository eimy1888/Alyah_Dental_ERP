import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ArrowRight, Star, Quote, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlans } from '../../../features/landing/hooks/usePlans';
import { useScrollReveal } from '../../../hooks/useScrollReveal';
import { motion } from 'framer-motion';

/* ── Plan style map ───────────────────────────────────────────────────────── */
const PLAN_STYLES = {
  basic:      { accent: '#6b7280', glow: 'rgba(107,114,128,0.12)', badge: null,           featured: false },
  pro:        { accent: '#2563eb', glow: 'rgba(37,99,235,0.22)',   badge: 'Most Popular', featured: true  },
  enterprise: { accent: '#7c3aed', glow: 'rgba(124,58,237,0.12)', badge: 'Enterprise',   featured: false },
};

/* ── Testimonials ─────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    initials: 'RG', name: 'Dr. Ruth Guta',
    role: 'Clinic Director, Nile Smile Specialty Dental',
    quote: 'Alyah Dental ERP turned our front desk, billing, and dentist scheduling into one disciplined system. The multi-branch view alone saved us hours every week.',
    color: '#2563eb',
  },
  {
    initials: 'BA', name: 'Bereket Ali',
    role: 'Operations Manager, Mercy Oral Health Center',
    quote: 'The multi-branch visibility feels like an enterprise platform, not a patched clinic tool. Our team adopted it in days.',
    color: '#059669',
  },
  {
    initials: 'MT', name: 'Mahi Tarekegn',
    role: 'Reception Lead, Alyah Dental Clinic',
    quote: "Queue updates, invoice tracking, and patient history are finally in the same workflow. I can't imagine going back.",
    color: '#7c3aed',
  },
];

/* ── Pricing card ─────────────────────────────────────────────────────────── */
function PricingCard({ plan, style, billing, index }) {
  const ref   = useScrollReveal({ threshold: 0.1 });
  const price = billing === 'monthly' ? plan.monthly_price : plan.annual_price;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const isPlanFree = plan.type === 'free';

  return (
    <motion.div
      ref={ref}
      className="reveal relative flex flex-col rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      style={{
        background: style.featured ? 'linear-gradient(160deg, #1e40af 0%, #2563eb 100%)' : 'white',
        border:     style.featured ? '1px solid #3b82f6' : '1px solid #f1f5f9',
        boxShadow:  style.featured ? `0 24px 64px ${style.glow}` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Badge */}
      {style.badge && (
        <div className="absolute top-0 inset-x-0 flex justify-center">
          <div className="flex items-center gap-1.5 text-xs font-bold px-5 py-1.5 rounded-b-xl"
            style={{
              background: style.featured ? 'rgba(255,255,255,0.18)' : `${style.accent}12`,
              color:      style.featured ? 'white' : style.accent,
              border:     style.featured ? '1px solid rgba(255,255,255,0.28)' : `1px solid ${style.accent}22`,
            }}>
            {style.featured && <Star className="w-3 h-3 fill-white" />}
            {style.badge}
          </div>
        </div>
      )}

      <div className={`p-6 flex flex-col flex-1 ${style.badge ? 'pt-11' : ''}`}>
        <p className="text-[10px] font-black tracking-widest uppercase mb-2"
          style={{ color: style.featured ? 'rgba(186,230,253,0.85)' : style.accent }}>
          {plan.slug?.toUpperCase()}
        </p>
        <h3 className="text-2xl font-black mb-3" style={{ color: style.featured ? 'white' : '#111827' }}>
          {plan.name}
        </h3>

        {isPlanFree ? (
          <div className="mb-3">
            <p className="text-3xl font-black leading-none" style={{ color: style.featured ? 'white' : '#111827' }}>Free</p>
            <p className="text-sm mt-1 font-semibold" style={{ color: style.featured ? 'rgba(186,230,253,0.75)' : '#16a34a' }}>
              14 days · no credit card · auto-suspends
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-3xl font-black leading-none lg:text-4xl"
                style={{ color: style.featured ? 'white' : '#111827' }}>
                ETB {Number(price).toLocaleString()}
              </span>
              <span className="mb-1.5 text-sm font-medium"
                style={{ color: style.featured ? 'rgba(186,230,253,0.65)' : '#9ca3af' }}>
                /mo
              </span>
            </div>
          </>
        )}

        <p className="text-sm mb-5"
          style={{ color: style.featured ? 'rgba(186,230,253,0.65)' : '#6b7280' }}>
          Up to {plan.max_users} users · {plan.max_branches} branch{plan.max_branches > 1 ? 'es' : ''} · {plan.max_storage_gb} GB
        </p>
        <div className="h-px mb-5"
          style={{ background: style.featured ? 'rgba(255,255,255,0.14)' : '#f1f5f9' }} />
        <ul className="space-y-2.5 mb-7 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: style.featured ? '#86efac' : '#10b981' }} />
              <span style={{ color: style.featured ? 'rgba(219,234,254,0.88)' : '#374151' }}>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          to={`/register?plan=${plan.id}&cycle=${billing}`}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
          style={style.featured
            ? { background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }
            : { background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0' }
          }>
          {isPlanFree ? 'Start free trial' : `Get started with ${plan.name}`}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ── Testimonial card ─────────────────────────────────────────────────────── */
function TestimonialCard({ t, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      className="rounded-2xl p-6 flex flex-col bg-white"
      style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <Quote className="w-7 h-7 mb-4 text-blue-100 fill-blue-100" />
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">"{t.quote}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-black"
          style={{ background: t.color }}>
          {t.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{t.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{t.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export default function PricingSection() {
  const [billing, setBilling] = useState('monthly');
  const { data, isLoading, isError, refetch, isFetching } = usePlans();
  const headerRef    = useScrollReveal({ threshold: 0.2 });
  const testimHeader = useScrollReveal({ threshold: 0.2 });

  const plans = data?.data || [];

  return (
    <section id="pricing" className="py-20 lg:py-28" style={{ background: '#f8fafc' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div ref={headerRef} className="reveal text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase rounded-full px-4 py-1.5 bg-blue-50 border border-blue-100 text-blue-600">
            Pricing
          </div>
          <h2 className="text-3xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.1]">
            Plans built for clinics
            <br />
            <span className="text-blue-600">that plan to grow.</span>
          </h2>
          <p className="text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Transparent billing, local-ready payment UX, and clear branch or user capacity limits.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center bg-white border border-gray-200 rounded-full p-1 gap-1 mt-2 shadow-sm">
            {['monthly', 'annual'].map(cycle => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                style={billing === cycle
                  ? { background: '#2563eb', color: 'white', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
                  : { color: '#6b7280' }
                }
              >
                {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                {cycle === 'annual' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Save 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse bg-white border border-gray-100" style={{ minHeight: 380 }}>
                <div className="p-6 space-y-4">
                  <div className="h-3 w-16 rounded-full bg-gray-100" />
                  <div className="h-7 w-32 rounded-lg bg-gray-100" />
                  <div className="h-10 w-28 rounded-lg bg-gray-100" />
                  <div className="h-px bg-gray-100 my-4" />
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-100 shrink-0" />
                      <div className="h-3 rounded-full bg-gray-100" style={{ width: `${55 + j * 10}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-12 gap-4">
            <p className="text-red-500 text-sm font-medium">Could not load plans. Check your connection or try again.</p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: '#2563eb', opacity: isFetching ? 0.6 : 1 }}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        {!isLoading && !isError && plans.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No plans available yet. Check back soon.</div>
        )}

        {!isLoading && !isError && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {plans.map((plan, i) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                style={PLAN_STYLES[plan.slug] || PLAN_STYLES.basic}
                billing={billing}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Testimonials */}
        <div>
          <div ref={testimHeader} className="reveal text-center mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase rounded-full px-4 py-1.5 bg-blue-50 border border-blue-100 text-blue-600">
              Testimonials
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-gray-900">
              What clinic teams say about Alyah Dental ERP
            </h3>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Real feedback from clinic directors, managers, and front-desk teams across Ethiopia.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.initials} t={t} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
