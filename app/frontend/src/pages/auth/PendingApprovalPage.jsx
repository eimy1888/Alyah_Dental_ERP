import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Clock, CheckCircle2, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

const STEPS = [
  { label: 'Registration submitted',    done: true },
  { label: 'Platform admin review',     active: true },
  { label: 'Clinic workspace created',  done: false },
  { label: 'Credentials emailed',       done: false },
];

export default function PendingApprovalPage() {
  const { state }         = useLocation();
  const clinicName        = state?.clinicName || 'Your Clinic';
  const clinicId          = state?.clinicId;
  const isFree            = state?.isFree;
  const [status, setStatus] = useState('pending_platform_approval');
  const [checks, setChecks] = useState(0);

  // Poll status every 10s
  useEffect(() => {
    if (!clinicId) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await apiClient.get(`/payment-status/${clinicId}`);
        const s = data?.data?.status;
        setStatus(s);
        setChecks(c => c + 1);
        if (s === 'active') clearInterval(poll);
      } catch { /* ignore */ }
    }, 10_000);
    return () => clearInterval(poll);
  }, [clinicId]);

  const isActive = status === 'active';

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg,#060d1a 0%,#0f2744 50%,#0a1628 100%)' }}>

      {/* Background dot grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 w-full max-w-lg">

        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className={`px-8 pt-8 pb-6 text-center ${isActive ? 'bg-emerald-50' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              isActive ? 'bg-emerald-100' : 'bg-white/20'
            }`}>
              {isActive
                ? <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                : <Clock className="w-8 h-8 text-white animate-pulse" />
              }
            </div>
            {isActive ? (
              <>
                <h1 className="text-xl font-black text-emerald-900">Clinic Approved! 🎉</h1>
                <p className="text-[13px] text-emerald-700 mt-1.5">
                  <span className="font-bold">{clinicName}</span> is now live. Check your email for login credentials.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-black text-white">Under Review</h1>
                <p className="text-[13px] text-blue-100 mt-1.5">
                  <span className="font-bold">{clinicName}</span> has been submitted and is awaiting platform approval.
                </p>
              </>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-7">

            {/* Progress steps */}
            <div className="space-y-3 mb-7">
              {STEPS.map((s, i) => {
                const done   = isActive ? true : s.done;
                const active = !isActive && s.active;
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-all ${
                      done   ? 'bg-emerald-500' :
                      active ? 'bg-blue-500 animate-pulse' :
                               'bg-gray-100 text-gray-300'
                    }`}>
                      {done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        : <span className={active ? 'text-white' : ''}>{i + 1}</span>
                      }
                    </div>
                    <span className={`text-sm ${done || active ? 'text-gray-800 font-semibold' : 'text-gray-300'}`}>
                      {s.label}
                    </span>
                    {active && (
                      <span className="ml-auto text-[10px] font-bold text-blue-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        In progress
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info box */}
            {!isActive && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">What happens next?</p>
                    <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
                      A platform administrator will review your registration. Once approved, you'll receive your login credentials at <span className="font-semibold">{state?.email || 'your email'}</span>.
                      {isFree && ' Your 14-day trial starts from approval date.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Poll status */}
            {!isActive && clinicId && (
              <p className="text-center text-[11px] text-gray-300 mb-5">
                Auto-checking status every 10 seconds · {checks} check{checks !== 1 ? 's' : ''} done
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isActive ? (
                <Link to="/login"
                  className="w-full py-3 rounded-xl text-white font-bold text-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
                  Go to Login →
                </Link>
              ) : (
                <a href="mailto:support@dentflowpro.com"
                  className="w-full py-3 rounded-xl text-center text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors font-medium">
                  Contact Support
                </a>
              )}
              <Link to="/" className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back to homepage
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-blue-400/40 mt-5">
          © 2026 Alyah Dental ERP · All rights reserved
        </p>
      </div>
    </div>
  );
}
