import { useEffect, useRef, useState } from 'react';
import { Activity, Building2, Clock, Shield, TrendingUp, Users } from 'lucide-react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

const STATS = [
  { icon: Building2, value: '126+', label: 'Clinics Onboarded', color: '#60a5fa' },
  { icon: Users, value: '4,200+', label: 'Active Patients', color: '#34d399' },
  { icon: Activity, value: '1.8M+', label: 'Appointments Handled', color: '#a78bfa' },
  { icon: TrendingUp, value: '99.98%', label: 'Platform Uptime SLA', color: '#fbbf24' },
  { icon: Shield, value: '100%', label: 'HIPAA-Ready Architecture', color: '#f87171' },
  { icon: Clock, value: '<24h', label: 'Avg. Approval Time', color: '#06b6d4' },
];

function AnimatedCounter({ target, duration = 2000 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const num = parseFloat(String(target).replace(/[^0-9.]/g, ''));
        if (Number.isNaN(num)) return;
        let current = 0;
        const step = num / (duration / 16);
        const interval = setInterval(() => {
          current += step;
          if (current >= num) {
            setValue(num);
            clearInterval(interval);
          } else {
            setValue(parseFloat(current.toFixed(1)));
          }
        }, 16);
      },
      { threshold: 0.5 }
    );

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  const display = String(target).replace(/[\d.]+/, value % 1 === 0 ? value.toLocaleString() : value.toFixed(1));
  return <span ref={ref}>{display}</span>;
}

export default function ParallaxStatsBand({ image }) {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const imageY = useSpring(useTransform(scrollYProgress, [0, 1], [-120, 120]), { stiffness: 70, damping: 30 });
  const contentY = useSpring(useTransform(scrollYProgress, [0, 1], [44, -44]), { stiffness: 70, damping: 30 });

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-20 sm:py-24">
      <motion.div className="absolute -inset-y-28 inset-x-0 will-change-transform" style={{ y: imageY }}>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover object-center"
          style={{ filter: 'saturate(1.4) brightness(0.6) contrast(1.1)' }}
        />
      </motion.div>

      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,13,26,0.88)_0%,rgba(15,39,68,0.78)_50%,rgba(6,13,26,0.88)_100%)]" />
      {/* shimmer grid */}
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      {/* scan line */}
      <motion.div
        className="absolute inset-x-0 h-px opacity-20 pointer-events-none"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(37,99,235,0.9),rgba(6,182,212,0.6),transparent)' }}
        animate={{ y: ['-100vh', '200vh'] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
      />

      <motion.div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style={{ y: contentY }}>
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white/72 backdrop-blur-xl">
            Platform Metrics
          </div>
          <h2 className="text-balance text-3xl font-black leading-tight text-white drop-shadow-2xl lg:text-5xl">
            Numbers that speak for{' '}
            <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
              themselves.
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATS.map(({ icon: Icon, value, label, color }, index) => (
            <motion.div
              key={label}
              className="group rounded-2xl border border-white/12 bg-white/[0.07] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <motion.div
                className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </motion.div>
              <p className="mb-1 text-2xl font-black" style={{ color }}>
                <AnimatedCounter target={value} duration={1800 + index * 100} />
              </p>
              <p className="text-xs font-medium leading-tight text-white/48">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
