import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import DENTAL_IMAGES from '../../../lib/dentalImages';

function Counter({ to, duration = 1800, delay = 0, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return; obs.disconnect();
      const t = setTimeout(() => {
        let cur = 0; const step = to / (duration / 16);
        const iv = setInterval(() => {
          cur += step;
          if (cur >= to) { setVal(to); clearInterval(iv); } else setVal(Math.floor(cur));
        }, 16);
      }, delay);
      return () => clearTimeout(t);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration, delay]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const STATS = [
  { label: 'Clinics',    value: 126,   suffix: '+',    color: '#60a5fa' },
  { label: 'Patients/mo', value: 18000, suffix: '+',   color: '#34d399', display: v => `${Math.round(v / 1000)}K+` },
  { label: 'Uptime',    value: 99,     suffix: '.98%', color: '#a78bfa' },
  { label: 'Workspaces', value: 6,     suffix: '',     color: '#fbbf24' },
];

const TRUST = ['HIPAA-ready', 'Platform-vetted clinics', 'No credit card required'];

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  /* Subtle parallax only — no opacity fade that causes fogginess */
  const bgY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 100]),
    { stiffness: 60, damping: 28 }
  );

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    /* No overflow-hidden on section itself — prevents clipping issues */
    <section
      id="hero"
      ref={sectionRef}
      className="relative bg-[#060e20]"
      style={{ minHeight: '100vh', paddingTop: 52 }}
    >
      {/* ── Full-bleed background image — vivid, not dark ── */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y: bgY }}
      >
        <img
          src={DENTAL_IMAGES.hero_modern_clinic}
          alt="Modern dental clinic"
          className="absolute inset-0 w-full h-full object-cover object-center"
          /* bright, saturated — no dimming filter */
          style={{ filter: 'saturate(1.25) contrast(1.05) brightness(0.88)' }}
          loading="eager"
        />

        {/* Left-side directional overlay — keeps text readable, right side stays vivid */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(4,11,30,0.93) 0%, rgba(4,11,30,0.75) 38%, rgba(4,11,30,0.25) 65%, rgba(4,11,30,0.0) 100%)',
          }}
        />

        {/* Very subtle bottom-of-section darkening — NOT white, does NOT bleed */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(4,11,30,0.55) 0%, transparent 30%)',
          }}
        />
      </motion.div>

      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8 flex items-center"
        style={{ minHeight: 'calc(100vh - 52px)' }}
      >
        <div className="grid lg:grid-cols-[1fr_0.95fr] gap-12 lg:gap-16 items-center w-full py-10 lg:py-14">

          {/* ── Left copy ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 40 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Live badge */}
            <motion.div
              className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-4 py-2 backdrop-blur-xl"
              whileHover={{ scale: 1.03, y: -2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">
                Alyah Dental ERP
              </span>
            </motion.div>

            <h1
              className="font-black leading-[1.02] tracking-tight text-white"
              style={{ fontSize: 'clamp(2.3rem, 4.8vw, 3.75rem)' }}
            >
              The operating system
              <br />
              <span
                style={{
                  background:
                    'linear-gradient(120deg,#60a5fa 0%,#38bdf8 40%,#a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                for modern dental
              </span>
              <br />
              practices.
            </h1>

            <p className="mt-5 max-w-xl text-[1.02rem] leading-7 text-white/65">
              Alyah Dental ERP unifies patients, appointments, billing, inventory,
              staffing, and analytics — one platform, six role workspaces, zero
              configuration friction.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-black text-white"
                  style={{
                    background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                    boxShadow:
                      '0 0 0 1px rgba(255,255,255,0.12) inset, 0 16px 48px rgba(37,99,235,0.55)',
                  }}
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white/85"
                  style={{
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Sign in
                </Link>
              </motion.div>
            </div>

            {/* Trust badges */}
            <div className="mt-7 flex flex-wrap gap-5">
              {TRUST.map(t => (
                <span key={t} className="flex items-center gap-1.5 text-[12px] font-medium text-white/45">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
                  {t}
                </span>
              ))}
            </div>

            {/* Stat cards */}
            <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 16 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  whileHover={{ y: -4, background: 'rgba(255,255,255,0.1)' }}
                >
                  <p className="text-[22px] font-black leading-none" style={{ color: s.color }}>
                    {s.display ? (
                      <span>{s.display(s.value)}</span>
                    ) : (
                      <><Counter to={s.value} delay={400 + i * 100} />{s.suffix}</>
                    )}
                  </p>
                  <p className="mt-1.5 text-[10px] font-semibold text-white/35 uppercase tracking-wider">
                    {s.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Right image — full size, no badges ── */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, y: 44, rotateX: 6 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 44, rotateX: mounted ? 0 : 6 }}
            transition={{ duration: 1.05, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="relative overflow-hidden rounded-[1.75rem]"
              style={{
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 48px 120px rgba(0,0,0,0.5)',
              }}
            >
              <img
                src={DENTAL_IMAGES.hero_dental_chair}
                alt="Premium dental operatory"
                className="w-full object-cover"
                style={{
                  aspectRatio: '4/3',
                  filter: 'saturate(1.2) contrast(1.06) brightness(1.04)',
                }}
                loading="eager"
              />
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Hard bottom edge — NO white fade, just a clean horizontal line via the next section's background ── */}
    </section>
  );
}
