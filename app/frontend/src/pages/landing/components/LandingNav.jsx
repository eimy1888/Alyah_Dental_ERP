import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Features',     section: 'features' },
  { label: 'How It Works', section: 'how-it-works' },
  { label: 'Pricing',      section: 'pricing' },
  { label: 'Showcase',     section: 'showcase' },
  { label: 'FAQ',          section: 'faq' },
];

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection]   = useState('hero');
  const location = useLocation();
  const navigate = useNavigate();

  const onScroll = useCallback(() => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    setScrolled(window.scrollY > 12);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: '-38% 0px -56% 0px' }
    );
    ['hero', ...NAV_LINKS.map(l => l.section)].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const scrollToSection = (e, section) => {
    e.preventDefault();
    setMobileOpen(false);
    const go = () => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    if (location.pathname !== '/') { navigate('/'); setTimeout(go, 200); return; }
    go();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.nav
        className="relative w-full"
        animate={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(4,11,30,0.15)',
          borderBottomColor: scrolled ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
        }}
        transition={{ duration: 0.25 }}
        style={{
          borderBottom: '1px solid',
          boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.07)' : 'none',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Scroll progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] rounded-full"
          style={{
            width: `${scrollProgress}%`,
            background: 'linear-gradient(90deg,#2563eb,#06b6d4,#a78bfa)',
            transition: 'width 80ms linear',
          }}
        />

        <div className="flex h-[52px] items-center justify-between px-4 lg:px-6 max-w-7xl mx-auto">

          {/* Logo */}
          <button
            onClick={e => scrollToSection(e, 'hero')}
            className="flex items-center gap-2 group"
            aria-label="Home"
          >
            <img
              src="/brand/alyah-logo.svg"
              alt="Alyah Dental ERP"
              className="h-8 w-auto object-contain transition-opacity group-hover:opacity-80"
            />
          </button>

          {/* Desktop nav — pill container */}
          <div
            className="hidden md:flex items-center gap-0.5 rounded-full px-1.5 py-1"
            style={{
              background: scrolled ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              border: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {NAV_LINKS.map(({ label, section }) => {
              const active = activeSection === section;
              return (
                <a
                  key={section}
                  href={`#${section}`}
                  onClick={e => scrollToSection(e, section)}
                  className="relative rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors duration-150"
                  style={{ color: active ? (scrolled ? '#2563eb' : '#fff') : (scrolled ? '#64748b' : 'rgba(255,255,255,0.7)') }}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: scrolled ? '#eff6ff' : 'rgba(255,255,255,0.15)' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </a>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/login"
              className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-all duration-150"
              style={{ color: scrolled ? '#374151' : 'rgba(255,255,255,0.85)' }}
            >
              Sign In
            </Link>
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-bold text-white transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  boxShadow: '0 2px 12px rgba(37,99,235,0.45)',
                }}
              >
                Get Started
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full md:hidden transition-all"
            style={{
              background: scrolled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)',
              border: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.15)',
              color: scrolled ? '#374151' : '#fff',
            }}
            aria-label="Menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen
                ? <motion.span key="x" initial={{rotate:-90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:90,opacity:0}} transition={{duration:0.15}}><X style={{width:15,height:15}} /></motion.span>
                : <motion.span key="m" initial={{rotate:90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:-90,opacity:0}} transition={{duration:0.15}}><Menu style={{width:15,height:15}} /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              transition={{duration:0.22,ease:[0.22,1,0.36,1]}}
              className="overflow-hidden md:hidden"
              style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)' }}
            >
              <div className="p-3 space-y-0.5 max-w-7xl mx-auto">
                {NAV_LINKS.map(({ label, section }, i) => (
                  <motion.a
                    key={section} href={`#${section}`} onClick={e => scrollToSection(e, section)}
                    className="flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{ color: activeSection === section ? '#2563eb' : '#374151', background: activeSection === section ? '#eff6ff' : 'transparent' }}
                    initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                  >
                    {label}
                  </motion.a>
                ))}
                <div className="pt-2.5 pb-1 grid gap-2 border-t border-gray-100 mt-2">
                  <Link to="/login" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-800">Sign In</Link>
                  <Link to="/register" className="rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white"
                    style={{background:'linear-gradient(135deg,#2563eb,#1d4ed8)',boxShadow:'0 4px 14px rgba(37,99,235,0.3)'}}>Get Started</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}
