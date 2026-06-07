import { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Phone, Mail, MapPin, Heart, Calendar, Clock, ChevronRight
} from 'lucide-react';
import { getClinicProfile } from '../../services/publicService';

const NAV_ITEMS = [
  { label: 'Home', to: '' },
  { label: 'Services', to: 'services' },
  { label: 'Our Team', to: 'team' },
  { label: 'Locations', to: 'locations' },
  { label: 'Reviews', to: 'reviews' },
  { label: 'Contact', to: 'contact' },
];

// At the top of PublicLayout, add Navigate import (already have it via react-router-dom)
// Replace the entire useEffect + loading/notFound checks with this:

export default function PublicLayout() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clinicProfile, setClinicProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── GUARD: reserved slugs must never reach PublicLayout ──────────────────
  // These are caught by explicit routes in App.jsx but this is a safety net
  const RESERVED_SLUGS = ['login', 'pending-approval']; // REMOVED 'register'

  useEffect(() => {
    if (!slug || RESERVED_SLUGS.includes(slug)) {
      navigate('/login', { replace: true });
      return;
    }

    const loadClinicProfile = async () => {
      try {
        const data = await getClinicProfile(slug);
        setClinicProfile(data);
      } catch (error) {
        console.error('Failed to load clinic profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClinicProfile();
  }, [slug]);

  // CHANGED: Book Now now redirects to LOGIN instead of REGISTER
  const handleBookNow = () => {
    navigate(`/clinic/${slug}/login`);
  };

  const handleLogin = () => {
    navigate(`/clinic/${slug}/login`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!clinicProfile && slug !== 'login') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Clinic Not Found</h1>
          <p className="text-gray-500 mt-2">The clinic you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-blue-600 text-white text-sm py-2">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-4">
            {clinicProfile?.phone && (
              <a href={`tel:${clinicProfile.phone}`} className="flex items-center gap-1 hover:text-blue-200 transition">
                <Phone className="w-3.5 h-3.5" /> {clinicProfile.phone}
              </a>
            )}
            {clinicProfile?.email && (
              <a href={`mailto:${clinicProfile.email}`} className="flex items-center gap-1 hover:text-blue-200 transition">
                <Mail className="w-3.5 h-3.5" /> {clinicProfile.email}
              </a>
            )}
            {clinicProfile?.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {clinicProfile.address}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {clinicProfile?.social_links?.facebook && (
              <a href={clinicProfile.social_links.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-blue-200">
                <span className="text-xs">📘</span>
              </a>
            )}
            {clinicProfile?.social_links?.instagram && (
              <a href={clinicProfile.social_links.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-blue-200">
                <span className="text-xs">📷</span>
              </a>
            )}
            {clinicProfile?.social_links?.twitter && (
              <a href={clinicProfile.social_links.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-blue-200">
                <span className="text-xs">🐦</span>
              </a>
            )}
            {clinicProfile?.social_links?.linkedin && (
              <a href={clinicProfile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-200">
                <span className="text-xs">🔗</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={`/clinic/${slug}`} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-none">
                  {clinicProfile?.name || 'Dental Clinic'}
                </p>
                <p className="text-[10px] font-semibold tracking-widest text-blue-600 uppercase">DENTAL CLINIC</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={`/clinic/${slug}/${item.to}`}
                  end={item.to === ''}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleLogin}
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors px-3 py-2"
              >
                Login
              </button>
              <button
                onClick={handleBookNow}
                className="text-sm font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all duration-200 shadow-sm"
              >
                Book Now
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lg">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={`/clinic/${slug}/${item.to}`}
                end={item.to === ''}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-gray-100 mt-2">
              <button
                onClick={() => { handleLogin(); setMobileMenuOpen(false); }}
                className="block text-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
              >
                Login
              </button>
              <button
                onClick={() => { handleBookNow(); setMobileMenuOpen(false); }}
                className="block text-center px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Book Now
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-200px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white fill-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">
                    {clinicProfile?.name || 'Dental Clinic'}
                  </p>
                  <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">DENTAL CLINIC</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Ethiopia's most trusted dental care provider. We combine world-class expertise with genuine care to give you the smile you deserve.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4">QUICK LINKS</h3>
              <ul className="space-y-2">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <Link to={`/clinic/${slug}/${item.to}`} className="text-sm text-gray-400 hover:text-blue-400 transition">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services Links */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4">SERVICES</h3>
              <ul className="space-y-2">
                <li><Link to={`/clinic/${slug}/services`} className="text-sm text-gray-400 hover:text-blue-400 transition">General Dentistry</Link></li>
                <li><Link to={`/clinic/${slug}/services`} className="text-sm text-gray-400 hover:text-blue-400 transition">Cosmetic Dentistry</Link></li>
                <li><Link to={`/clinic/${slug}/services`} className="text-sm text-gray-400 hover:text-blue-400 transition">Orthodontics</Link></li>
                <li><Link to={`/clinic/${slug}/services`} className="text-sm text-gray-400 hover:text-blue-400 transition">Oral Surgery</Link></li>
                <li><Link to={`/clinic/${slug}/services`} className="text-sm text-gray-400 hover:text-blue-400 transition">Emergency Care</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4">CONTACT</h3>
              <ul className="space-y-2">
                {clinicProfile?.phone && (
                  <li className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="w-3.5 h-3.5" /> {clinicProfile.phone}
                  </li>
                )}
                {clinicProfile?.email && (
                  <li className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail className="w-3.5 h-3.5" /> {clinicProfile.email}
                  </li>
                )}
                {clinicProfile?.address && (
                  <li className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-3.5 h-3.5" /> {clinicProfile.address}
                  </li>
                )}
              </ul>
              <div className="flex gap-3 mt-4">
                {clinicProfile?.social_links?.facebook && (
                  <a href={clinicProfile.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                    <span className="text-sm">📘</span>
                  </a>
                )}
                {clinicProfile?.social_links?.instagram && (
                  <a href={clinicProfile.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                    <span className="text-sm">📷</span>
                  </a>
                )}
                {clinicProfile?.social_links?.twitter && (
                  <a href={clinicProfile.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                    <span className="text-sm">🐦</span>
                  </a>
                )}
                {clinicProfile?.social_links?.linkedin && (
                  <a href={clinicProfile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                    <span className="text-sm">🔗</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} {clinicProfile?.name || 'Dental Clinic'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}