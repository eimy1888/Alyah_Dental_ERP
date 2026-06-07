import { Heart, CalendarDays, CreditCard, TrendingUp, Package, Globe, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: Heart, label: 'Patient Management', number: '01',
    description: 'Unified profiles with full treatment history, clinical notes, X-rays, prescriptions, and billing — all linked in one chart.',
    accent: '#e11d48', bg: 'rgba(225,29,72,0.07)', border: 'rgba(225,29,72,0.14)',
    highlights: ['Treatment timelines', 'Clinical attachments', 'Billing history'],
  },
  {
    icon: CalendarDays, label: 'Appointment Scheduling', number: '02',
    description: 'Queue-aware scheduling with daily, weekly, and chairside views. Smart conflict detection across all branches.',
    accent: '#2563eb', bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.14)',
    highlights: ['Multi-branch calendar', 'Walk-in queue', 'SMS reminders'],
  },
  {
    icon: CreditCard, label: 'Billing & Invoicing', number: '03',
    description: 'Auto-generated invoices, partial payments, insurance integration, and ETB-native receipt printing.',
    accent: '#059669', bg: 'rgba(5,150,105,0.07)', border: 'rgba(5,150,105,0.14)',
    highlights: ['One-click invoices', 'Payment tracking', 'Insurance claims'],
  },
  {
    icon: TrendingUp, label: 'Finance Management', number: '04',
    description: 'Daily cash-close workflow, P&L reports, expense tracking, and accountant workspace with full audit trail.',
    accent: '#d97706', bg: 'rgba(217,119,6,0.07)', border: 'rgba(217,119,6,0.14)',
    highlights: ['Daily ledger', 'P&L reports', 'Expense tracking'],
  },
  {
    icon: Package, label: 'Inventory Control', number: '05',
    description: 'Real-time stock levels, low-stock alerts, supplier orders, expiry monitoring, and per-branch consumption analytics.',
    accent: '#ea580c', bg: 'rgba(234,88,12,0.07)', border: 'rgba(234,88,12,0.14)',
    highlights: ['Reorder alerts', 'Expiry tracking', 'Supplier orders'],
  },
  {
    icon: Globe, label: 'Clinic Showcase', number: '06',
    description: 'Public clinic profile with services, staff, working hours, and an online appointment request form for patients.',
    accent: '#7c3aed', bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.14)',
    highlights: ['Public website', 'Online booking', 'Custom branding'],
  },
];

const easing = [0.22, 1, 0.36, 1];

function FeatureCard({ icon: Icon, label, description, accent, bg, border, number, highlights, index }) {
  return (
    <motion.div
      className="group relative rounded-2xl overflow-hidden bg-white cursor-default"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: easing }}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: easing } }}
      style={{ border: '1px solid #f0f4f8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 20px 56px rgba(0,0,0,0.1), 0 0 0 1px ${border}`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.border = '1px solid #f0f4f8'; }}
    >
      {/* Left accent stripe */}
      <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }} />

      {/* Top color bar */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />

      <div className="p-6 relative">
        {/* Number watermark */}
        <div className="absolute -bottom-2 -right-2 text-[7rem] font-black leading-none select-none pointer-events-none"
          style={{ color: accent, opacity: 0.04 }}>
          {number}
        </div>

        {/* Icon + label */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <Icon style={{ width: 19, height: 19, color: accent }} />
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1" style={{ color: accent }} />
        </div>

        <h3 className="text-[15px] font-bold text-gray-900 mb-2 leading-snug">{label}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">{description}</p>

        {/* Highlights */}
        <div className="flex flex-wrap gap-2">
          {highlights.map(h => (
            <span key={h} className="text-[11px] font-semibold rounded-full px-2.5 py-1"
              style={{ background: bg, color: accent, border: `1px solid ${border}` }}>
              {h}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 relative" style={{ background: '#f8fafc' }}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(37,99,235,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8">

        {/* Header */}
        <motion.div className="text-center mb-16 max-w-2xl mx-auto"
          initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-60px'}}
          transition={{duration:0.6,ease:easing}}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.15em] uppercase rounded-full px-3.5 py-1.5 mb-5 bg-blue-50 border border-blue-100 text-blue-600">
            Core Modules
          </span>
          <h2 className="text-[clamp(1.9rem,4vw,3.2rem)] font-black text-gray-900 tracking-tight leading-[1.1] mb-4">
            Everything a dental practice needs,<br />
            <span className="text-blue-600">in one place.</span>
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            Six production-ready modules covering every operational layer — from the front desk to the finance office.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => <FeatureCard key={f.label} {...f} index={i} />)}
        </div>
      </div>
    </section>
  );
}
