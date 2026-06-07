import { ClipboardList, BadgeCheck, LayoutDashboard, Globe, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const STEPS = [
  {
    n: '01', icon: ClipboardList, title: 'Register', time: '~10 min',
    description: 'Submit clinic info, owner details, compliance documents, plan selection, and payment method in 5 guided steps.',
    accent: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)',
    pill_bg: 'rgba(37,99,235,0.08)', pill_text: '#2563eb',
  },
  {
    n: '02', icon: BadgeCheck, title: 'Get Approved', time: '< 24 hrs',
    description: 'Our platform admins review your trade license, documents, and subscription. Most clinics are approved same day.',
    accent: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)',
    pill_bg: 'rgba(217,119,6,0.08)', pill_text: '#b45309',
  },
  {
    n: '03', icon: LayoutDashboard, title: 'Unlock Workspace', time: 'Instant',
    description: 'Every staff role automatically gets their tailored dashboard — appointments, billing, inventory, finance, and more.',
    accent: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)',
    pill_bg: 'rgba(5,150,105,0.08)', pill_text: '#047857',
  },
  {
    n: '04', icon: Globe, title: 'Go Live', time: 'Day 1',
    description: 'Your public clinic profile activates — patients can discover you, view services, and book appointments online.',
    accent: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)',
    pill_bg: 'rgba(124,58,237,0.08)', pill_text: '#6d28d9',
  },
];

function StepCard({ step, index, total }) {
  return (
    <motion.div className="relative flex flex-col"
      initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}}
      viewport={{once:true,margin:'-40px'}} transition={{duration:0.5,delay:index*0.1,ease}}>

      {/* Connector */}
      {index < total - 1 && (
        <div className="hidden lg:block absolute top-10 left-[calc(100%+1px)] w-[calc(100%-80px)] translate-x-10 z-10 pointer-events-none">
          <motion.div className="h-[1px] w-full"
            style={{ background: `linear-gradient(90deg, ${step.accent}60, transparent)` }}
            initial={{scaleX:0}} whileInView={{scaleX:1}} viewport={{once:true}}
            transition={{duration:0.7,delay:index*0.1+0.3}} />
        </div>
      )}

      <motion.div className="relative bg-white rounded-2xl p-6 flex-1"
        style={{ border: '1px solid #f0f4f8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.25s ease' }}
        whileHover={{ y: -6, boxShadow: `0 20px 48px rgba(0,0,0,0.09), 0 0 0 1px ${step.border}` }}>

        {/* Accent top line */}
        <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${step.accent}, ${step.accent}33)` }} />

        {/* Step + time */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: step.bg, border: `1px solid ${step.border}` }}>
              <step.icon style={{ width: 20, height: 20, color: step.accent }} />
            </div>
            <span className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: step.accent }}>Step {step.n}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1"
            style={{ background: step.pill_bg, color: step.pill_text }}>
            <Clock className="w-3 h-3" />{step.time}
          </span>
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>

        {/* Number watermark */}
        <div className="absolute -bottom-2 -right-2 text-[6rem] font-black leading-none select-none pointer-events-none opacity-[0.03]"
          style={{ color: step.accent }}>{step.n}</div>
      </motion.div>
    </motion.div>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">

        <motion.div className="text-center mb-16 max-w-2xl mx-auto"
          initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-60px'}}
          transition={{duration:0.6,ease}}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.15em] uppercase rounded-full px-3.5 py-1.5 mb-5 bg-blue-50 border border-blue-100 text-blue-600">
            How It Works
          </span>
          <h2 className="text-[clamp(1.9rem,4vw,3.2rem)] font-black text-gray-900 tracking-tight leading-[1.1] mb-4">
            From registration to<br />
            <span className="text-blue-600">fully operational in 24 hrs.</span>
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            A structured 4-step pipeline — apply, get verified, unlock your workspace, and go live.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {STEPS.map((s, i) => <StepCard key={s.n} step={s} index={i} total={STEPS.length} />)}
        </div>

        {/* CTA banner */}
        <motion.div
          className="relative overflow-hidden rounded-2xl px-8 py-8 lg:px-10 lg:py-9 flex flex-col lg:flex-row items-center justify-between gap-6"
          style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 50%,#2563eb 100%)', boxShadow: '0 24px 64px rgba(37,99,235,0.22)' }}
          initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,delay:0.15}}>
          {/* Dot texture */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <p className="text-lg font-black text-white mb-1">Ready to apply?</p>
            <p className="text-sm text-blue-200">Most clinics are approved within 24 hours. No setup fee.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 relative">
            <Link to="/register"
              className="inline-flex items-center gap-2 font-bold text-sm text-blue-700 bg-white rounded-xl px-7 py-3 transition-all hover:shadow-xl hover:-translate-y-0.5">
              Register your clinic <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 font-semibold text-sm text-white/80 rounded-xl px-6 py-3 transition-all hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)' }}>
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
