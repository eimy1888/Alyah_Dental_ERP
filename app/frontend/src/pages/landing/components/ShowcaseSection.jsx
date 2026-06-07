import { MapPin, CheckCircle2, ArrowRight, Globe, Phone, Mail, Building2, Users, Star, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApprovedClinics } from '../../../features/landing/hooks/useApprovedClinics';

const ease = [0.22, 1, 0.36, 1];

const PALETTE = [
  { accent: '#2563eb', light: '#eff6ff', border: 'rgba(37,99,235,0.15)' },
  { accent: '#0d9488', light: '#f0fdfa', border: 'rgba(13,148,136,0.15)' },
  { accent: '#7c3aed', light: '#f5f3ff', border: 'rgba(124,58,237,0.15)' },
  { accent: '#d97706', light: '#fffbeb', border: 'rgba(217,119,6,0.15)' },
  { accent: '#e11d48', light: '#fff1f2', border: 'rgba(225,29,72,0.15)'  },
  { accent: '#059669', light: '#f0fdf4', border: 'rgba(5,150,105,0.15)'  },
];

function ClinicCard({ clinic, index }) {
  const p = PALETTE[index % PALETTE.length];
  const initial = clinic.name?.charAt(0)?.toUpperCase() ?? '?';
  const slug = clinic.slug || clinic.subdomain;
  const hasStats = clinic.stats && Object.values(clinic.stats).some(Boolean);

  return (
    <motion.div
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: index * 0.07, ease }}
      whileHover={{ y: -7, transition: { duration: 0.22, ease } }}
      style={{ border: '1px solid #f0f4f8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.25s ease' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 24px 64px rgba(0,0,0,0.1), 0 0 0 1px ${p.border}`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      {/* Top color bar */}
      <div className="h-[3px] w-full" style={{ background: p.accent }} />

      <div className="p-6 flex flex-col flex-1">

        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
              style={{ background: p.light, color: p.accent, border: `1px solid ${p.border}` }}>
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-gray-900 leading-snug truncate">{clinic.name}</h3>
              {(clinic.city || clinic.address) && (
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{clinic.city || clinic.address}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />Approved
          </div>
        </div>

        {/* Specialty */}
        {clinic.specialty && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: p.light, color: p.accent, border: `1px solid ${p.border}` }}>
              <Globe className="w-3 h-3" />{clinic.specialty}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-2">
          {clinic.hero_subtitle || 'Platform-approved dental clinic powered by Alyah Dental ERP.'}
        </p>

        {/* Stats */}
        {hasStats && (
          <div className="flex items-center gap-5 py-3 mb-3 border-t border-gray-100">
            {clinic.stats.happy_patients && (
              <div>
                <p className="text-sm font-black" style={{ color: p.accent }}>
                  {Number(clinic.stats.happy_patients).toLocaleString()}+
                </p>
                <p className="text-[10px] text-gray-400 font-medium">Patients</p>
              </div>
            )}
            {clinic.stats.years_experience && (
              <div>
                <p className="text-sm font-black" style={{ color: p.accent }}>{clinic.stats.years_experience} yrs</p>
                <p className="text-[10px] text-gray-400 font-medium">Experience</p>
              </div>
            )}
            {clinic.stats.satisfaction_rate && (
              <div>
                <p className="text-sm font-black" style={{ color: p.accent }}>{clinic.stats.satisfaction_rate}%</p>
                <p className="text-[10px] text-gray-400 font-medium">Satisfaction</p>
              </div>
            )}
          </div>
        )}

        {/* Contact row */}
        <div className="flex flex-wrap gap-3 mb-4 text-[11px] text-gray-400">
          {clinic.phone && (
            <a href={`tel:${clinic.phone}`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
              <Phone className="w-3 h-3" />{clinic.phone}
            </a>
          )}
          {clinic.email && (
            <a href={`mailto:${clinic.email}`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
              <Mail className="w-3 h-3" />{clinic.email}
            </a>
          )}
        </div>

        {/* CTA */}
        <div className="pt-3 border-t border-gray-100">
          {slug ? (
            <Link to={`/clinic/${slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all group/link"
              style={{ color: p.accent }}>
              View clinic profile
              <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </Link>
          ) : (
            <span className="text-sm text-gray-400 italic">Profile coming soon</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="h-[3px] bg-gray-200 animate-pulse" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="h-8 bg-gray-50 rounded-xl animate-pulse mt-2" />
      </div>
    </div>
  );
}

export default function ShowcaseSection() {
  const { data: clinics = [], isLoading, isError } = useApprovedClinics();

  return (
    <section id="showcase" className="py-24 lg:py-32" style={{ background: '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">

        {/* Header */}
        <motion.div className="text-center mb-16 max-w-2xl mx-auto"
          initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-60px'}}
          transition={{duration:0.6,ease}}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.15em] uppercase rounded-full px-3.5 py-1.5 mb-5 bg-blue-50 border border-blue-100 text-blue-600">
            <Building2 className="w-3 h-3" />Platform Clinics
          </span>
          <h2 className="text-[clamp(1.9rem,4vw,3.2rem)] font-black text-gray-900 tracking-tight leading-[1.1] mb-4">
            Real clinics.<br />
            <span className="text-blue-600">Running live on DentFlow Pro.</span>
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            Every clinic below is platform-approved and using Alyah Dental ERP to run their daily operations.
          </p>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {[0,1,2].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-12 rounded-2xl border border-gray-100 bg-gray-50">
            <p className="text-gray-400 text-sm">Could not load clinics. Please try again later.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && clinics.length === 0 && (
          <motion.div className="text-center py-20 max-w-sm mx-auto"
            initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}>
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Be the first clinic</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">No showcased clinics yet. Register and get approved to appear here.</p>
            <Link to="/register" className="inline-flex items-center gap-2 font-semibold text-sm text-white rounded-xl px-7 py-3"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)' }}>
              Register your clinic <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Cards */}
        {!isLoading && !isError && clinics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {clinics.map((clinic, i) => <ClinicCard key={clinic.id} clinic={clinic} index={i} />)}
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          className="rounded-2xl p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5}}>
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Want your clinic listed here?</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              Register, complete onboarding, and get approved. Your clinic profile goes live the same day.
            </p>
          </div>
          <Link to="/register"
            className="inline-flex items-center gap-2 font-bold text-sm text-white rounded-xl px-8 py-3.5 shrink-0 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 14px rgba(37,99,235,0.28)' }}>
            Register your clinic <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
