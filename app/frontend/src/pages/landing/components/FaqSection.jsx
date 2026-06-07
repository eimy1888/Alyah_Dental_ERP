import { useState } from 'react';
import { Plus, ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const FAQS = [
  { q: 'Does Alyah Dental ERP support multi-branch dental groups?', a: 'Yes. Pro and Enterprise plans support 5 and 20 branches respectively. Each branch gets its own manager workspace, inventory tracking, appointment queues, and finance reporting â€” all under one clinic admin account.' },
  { q: 'Can a clinic start before platform approval?', a: 'No. Once you submit your registration, your workspace remains locked until a platform admin reviews your documents and confirms your subscription. This ensures every clinic on the platform meets compliance standards.' },
  { q: 'Which payment methods are supported?', a: 'During onboarding you can select Telebirr, CBE Birr, or bank transfer as your payment method. The platform admin confirms payment details before approving your account.' },
  { q: 'How does the role-based workspace system work?', a: 'After approval, each staff member logs in and is routed to their role-specific dashboard. Receptionists see appointments and billing. Dentists see patient charts. Accountants see finance. No shared dashboards, no permission confusion.' },
  { q: 'Can clinic admins customize their public showcase page?', a: 'Yes. From Settings â†’ Showcase, clinic admins can update the hero title, subtitle, specialty, contact details, social links, and key stats. Changes appear on the public listing immediately.' },
  { q: 'What happens if my subscription lapses?', a: 'Your workspace is suspended immediately â€” staff cannot log in and the public showcase is hidden. Data is retained for 30 days. Reactivating your subscription restores full access instantly.' },
  { q: 'Can I add more branches after registration?', a: 'Yes. Clinic admins can add branches from the settings panel at any time, subject to the branch limit of their current plan. Upgrading your plan unlocks additional branch slots immediately.' },
  { q: 'Is Amharic language supported?', a: 'Amharic support is on the roadmap. The current release ships in English with ETB currency formatting throughout. Localization hooks are already in place for a future update.' },
];

function FaqItem({ faq, isOpen, onToggle, index }) {
  return (
    <motion.div className="overflow-hidden rounded-xl"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      style={{
        background: 'white',
        border: isOpen ? '1px solid #bfdbfe' : '1px solid #f0f4f8',
        boxShadow: isOpen ? '0 4px 20px rgba(37,99,235,0.07)' : '0 1px 3px rgba(0,0,0,0.03)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-gray-50/70 transition-colors duration-150">
        <span className="text-[14.5px] font-semibold text-gray-900 leading-snug">{faq.q}</span>
        <motion.div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150"
          style={{ background: isOpen ? '#dbeafe' : '#f1f5f9' }}
          animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.22 }}>
          <Plus className="w-3.5 h-3.5" style={{ color: isOpen ? '#2563eb' : '#94a3b8' }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease }}>
            <div className="px-5 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
              {faq.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqSection() {
  const [open, setOpen] = useState(null);

  return (
    <section id="faq" className="py-24 lg:py-32 relative" style={{ background: '#f8fafc' }}>
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(37,99,235,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative max-w-3xl mx-auto px-5 lg:px-8">

        {/* Header */}
        <motion.div className="text-center mb-14"
          initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-60px'}}
          transition={{duration:0.6,ease}}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.15em] uppercase rounded-full px-3.5 py-1.5 mb-5 bg-blue-50 border border-blue-100 text-blue-600">
            FAQ
          </span>
          <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black text-gray-900 tracking-tight leading-[1.1] mb-4">
            Frequently asked questions
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            Everything you need to know about onboarding, approvals, roles, and billing.
          </p>
        </motion.div>

        {/* List â€” two columns on lg */}
        <div className="space-y-2 mb-12">
          {FAQS.map((f, i) => (
            <FaqItem key={i} faq={f} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} index={i} />
          ))}
        </div>

        {/* Bottom row */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Contact */}
          <motion.div
            className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm flex flex-col gap-4"
            initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.4}}
            whileHover={{y:-3}}>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-gray-900 mb-1">Still have questions?</h4>
              <p className="text-sm text-gray-500 leading-relaxed">We'll walk you through onboarding, plan selection, and governance before you register.</p>
            </div>
            <a href="mailto:support@dentflowpro.com"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors w-fit">
              Contact support <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>

          {/* Register */}
          <motion.div
            className="rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', boxShadow: '0 12px 40px rgba(37,99,235,0.2)' }}
            initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.4,delay:0.05}}
            whileHover={{y:-3}}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative">
              <h4 className="text-[15px] font-bold text-white mb-2">Ready to get started?</h4>
              <p className="text-sm text-blue-200 leading-relaxed mb-5">Register today, choose a plan, and enter the approval pipeline.</p>
              <Link to="/register"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 bg-white rounded-xl px-5 py-2.5 transition-all hover:shadow-lg w-fit">
                Register your clinic <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

