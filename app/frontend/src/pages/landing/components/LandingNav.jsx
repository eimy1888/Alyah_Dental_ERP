import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, X } from 'lucide-react';
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
    setScrolled(window.scrollY > 10);
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
      <nav
        className="relative w-full transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
          boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.06)' : 'none',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-[2px]"
          style={{ width: `${scrollProgress}%`, background: 'linear-gradient(90deg,#2563eb,#06b6d4)', transition: 'width 80ms linear' }} />

        <div className="flex h-[60px] items-center justify-between px-5 lg:px-8 max-w-7xl mx-auto">

          {/* Logo */}
          <button onClick={e => scrollToSection(e, 'hero')} className="flex items-center group" aria-label="Home">
            <img src="/brand/alyah-logo.svg" alt="Alyah Dental ERP" className="h-9 w-auto object-contain" />
          </button>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map(({ label, section }) => {
              const active = activeSection === section;
              return (
                <li key={section}>
                  <a href={`#${section}`} onClick={e => scrollToSection(e, section)}
                    className="relative block rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-150"
                    style={{ color: active ? '#2563eb' : '#64748b' }}>
                    {active && (
                      <motion.span layoutId="nav-pill"
                        className="absolute inset-0 rounded-lg bg-blue-50"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                    )}
                    <span className="relative">{label}</span>
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login"
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150">
              Sign In
            </Link>
            <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register"
                className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                Get Started
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 md:hidden"
            aria-label="Menu">
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen
                ? <motion.span key="x" initial={{rotate:-90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:90,opacity:0}} transition={{duration:0.15}}><X className="h-4.5 w-4.5" style={{width:18,height:18}} /></motion.span>
                : <motion.span key="m" initial={{rotate:90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:-90,opacity:0}} transition={{duration:0.15}}><Menu className="h-4.5 w-4.5" style={{width:18,height:18}} /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              transition={{duration:0.25,ease:[0.22,1,0.36,1]}} className="overflow-hidden border-t border-gray-100 md:hidden">
              <div className="p-3 space-y-0.5 max-w-7xl mx-auto">
                {NAV_LINKS.map(({ label, section }, i) => (
                  <motion.a key={section} href={`#${section}`} onClick={e => scrollToSection(e, section)}
                    className="flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
                    style={{ color: activeSection === section ? '#2563eb' : '#374151', background: activeSection === section ? '#eff6ff' : 'transparent' }}
                    initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}>
                    {label}
                  </motion.a>
                ))}
                <div className="pt-3 pb-1 grid gap-2 border-t border-gray-100 mt-2">
                  <Link to="/login" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-800">Sign In</Link>
                  <Link to="/register" className="rounded-xl px-4 py-3 text-center text-sm font-bold text-white"
                    style={{background:'linear-gradient(135deg,#2563eb,#1d4ed8)',boxShadow:'0 4px 14px rgba(37,99,235,0.3)'}}>Get Started</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
