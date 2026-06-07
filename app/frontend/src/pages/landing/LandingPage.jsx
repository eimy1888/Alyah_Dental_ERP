import { useEffect, useState } from 'react';
import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import PricingSection from './components/PricingSection';
import ShowcaseSection from './components/ShowcaseSection';
import FaqSection from './components/FaqSection';
import CtaSection from './components/CtaSection';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="font-sans antialiased"
      style={{
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.4s ease',
        /* No overflow-x-hidden here — it was causing sections to bleed */
        background: 'white',
      }}
    >
      <LandingNav />

      <main>
        {/* Hero — dark, full height */}
        <HeroSection />

        {/* Sharp transition: dark hero → light gray features */}
        {/* FeaturesSection has bg:#f8fafc — hard boundary, no fade */}
        <FeaturesSection />

        {/* White */}
        <HowItWorksSection />

        {/* Light gray — separated by 1px border top */}
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          <PricingSection />
        </div>

        {/* White — clean break */}
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          <ShowcaseSection />
        </div>

        {/* Light gray */}
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          <FaqSection />
        </div>

        {/* White */}
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          <CtaSection />
        </div>
      </main>

      <div style={{ borderTop: '1px solid #e2e8f0' }}>
        <LandingFooter />
      </div>
    </div>
  );
}
