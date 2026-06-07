import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock, Building2, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const STATS = [
  { value: '126+',   label: 'Clinics onboarded' },
  { value: '18K+',   label: 'Monthly appointments' },
  { value: '99.98%', label: 'Uptime SLA' },
  { value: '6',      label: 'Role workspaces' },
];

const TRUST = [
  { icon: ShieldCheck, label: 'Platform-approved only' },
  { icon: Clock,       label: 'Approved within 24 hours' },
  { icon: Building2,   label: 'Multi-branch ready' },
];

export default function CtaSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-5 lg:px-8">

        <motion.div className="rounded-3xl overflow-hidden"
          style={{ boxShadow: '0 32px 80px rgba(37,99,235,0.12), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #dbeafe' }}
          initial={{opacity:0,y:32}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-60px'}}
          transition={{duration:0.65,ease}}>

          {/* ── Blue hero band ── */}
          <div className="relative overflow-hidden px-8 py-14 lg:px-16 lg:py-16 text-center"
            style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 40%,#2563eb 70%,#3b82f6 100%)' }}>

            {/* Dot texture */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Stars */}
            <motion.div className="flex items-center justify-center gap-1 mb-6"
              initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}}>
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} initial={{opacity:0,scale:0}} whileInView={{opacity:1,scale:1}} viewport={{once:true}}
                  transition={{delay:0.15+i*0.06,type:'spring'}}>
                  <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                </motion.div>
              ))}
              <span className="ml-2 text-sm text-white/60 font-medium">4.9 avg · 126+ clinics</span>
            </motion.div>

            {/* Badge */}
            <motion.div className="flex justify-center mb-8"
              initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.15}}>
              <span className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.15em] uppercase rounded-full px-4 py-1.5 text-white/80"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                Get Started Today
              </span>
            </motion.div>

            <motion.h2 className="text-[clamp(1.9rem,4.5vw,3rem)] font-black text-white leading-[1.08] tracking-tight mb-5 max-w-2xl mx-auto"
              initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.2}}>
              Your clinic deserves a system<br />
              <span style={{ background: 'linear-gradient(120deg,#bfdbfe,#a5f3fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                built for growth.
              </span>
            </motion.h2>

            <motion.p className="text-base text-blue-200 max-w-lg mx-auto mb-9 leading-relaxed"
              initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.25}}>
              Register today, choose your plan, and enter the platform approval pipeline. Full workspace and public profile unlock on approval.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-3"
              initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.3}}>
              <motion.div whileHover={{scale:1.04,y:-2}} whileTap={{scale:0.97}}>
                <Link to="/register"
                  className="inline-flex items-center gap-2 font-bold text-sm text-blue-700 bg-white rounded-xl px-9 py-3.5 transition-all hover:shadow-xl">
                  Register your clinic <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{scale:1.03,y:-1}} whileTap={{scale:0.97}}>
                <Link to="/login"
                  className="inline-flex items-center gap-2 font-semibold text-sm text-white/80 rounded-xl px-8 py-3.5 transition-all hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.09)' }}>
                  Sign in to workspace
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {STATS.map(({ value, label }, i) => (
              <motion.div key={label} className="py-7 px-5 text-center"
                initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                transition={{delay:0.1+i*0.06}}>
                <p className="text-2xl font-black text-gray-900 mb-1">{value}</p>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Trust bar ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 lg:gap-10 px-8 py-5 border-t border-gray-100 bg-gray-50/70">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Icon className="w-4 h-4 text-gray-400" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
