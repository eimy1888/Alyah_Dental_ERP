import { useState, useEffect } from 'react';
import { Calendar, Clock, Stethoscope, Building2, FileText, CreditCard, CheckCircle2 } from 'lucide-react';
import { getDashboard } from '../../services/patientService';
import { SectionCard, PageHeader, StatusBadge } from '../../components/ui/DashCard';

const recordIcons = { prescription: '💊', clinical_note: '📋', xray: '🩻', invoice: '💰', payment: '💳' };

const formatDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PatientDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setDashboard(await getDashboard());
      } catch { showToast('Failed to load dashboard data', 'error'); }
      finally   { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
  if (!dashboard) return <div className="text-center py-12 text-gray-500">Unable to load dashboard data.</div>;

  return (
    <div className="space-y-7">
      {toast && (
        <div className={`fixed top-20 right-5 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <PageHeader
        eyebrow="Patient Portal"
        title="My Dashboard"
        subtitle="Welcome back! View your upcoming appointments and recent medical records."
      />

      {/* Clinic profile hero card */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #007BFF 0%, #00D4FF 100%)', boxShadow: '0 16px 48px rgba(0,123,255,0.25)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 bg-white -translate-y-16 translate-x-16" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black">{dashboard.clinic_profile?.name || 'Dental Clinic'}</h2>
          </div>
          <p className="text-white/80 text-sm max-w-lg mb-4">
            {dashboard.clinic_profile?.description || 'Premium dental care with real-time patient operations.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {dashboard.clinic_profile?.features?.map((f, i) => (
              <span key={i} className="text-[11px] font-semibold bg-white/15 border border-white/20 px-3 py-1 rounded-full">✓ {f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Clinic card status */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', boxShadow: '0 8px 32px rgba(5,150,105,0.2)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-[10px] font-black tracking-[0.18em] uppercase mb-1">Clinic Card</p>
            <h3 className="text-xl font-black">{dashboard.patient?.has_active_card ? 'Active' : 'Not Active'}</h3>
            {dashboard.patient?.card_number && <p className="text-green-100 text-[12px] mt-1">Card: {dashboard.patient.card_number}</p>}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
        </div>
        {!dashboard.patient?.has_active_card && (
          <p className="text-green-100 text-[12px] mt-3">Ask the receptionist to purchase a clinic card for benefits.</p>
        )}
      </div>

      {/* Appointments + Medical records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard title="Upcoming Appointments" subtitle="Your next scheduled visits">
          <div className="p-5">
            {!dashboard.recent_appointments?.length ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-[13px]">No upcoming appointments</p>
                <p className="text-[11px] mt-1 text-gray-400">Contact the clinic to schedule a visit</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.recent_appointments.map(apt => (
                  <div key={apt.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/60 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{apt.type}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-[11px] text-gray-500">{apt.date} at {apt.time}</p>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">with Dr. {apt.dentist_name}</p>
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recent Medical Records" subtitle="Your latest health updates">
          <div className="p-5">
            {!dashboard.recent_medical_records?.length ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-[13px]">No medical records yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.recent_medical_records.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                    <div className="text-2xl w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                      {recordIcons[rec.type] || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[13px] font-bold text-gray-900 capitalize">{rec.type?.replace('_', ' ')}</p>
                        <p className="text-[10px] text-gray-400 shrink-0">{rec.date}</p>
                      </div>
                      <p className="text-[12px] font-semibold text-gray-700">{rec.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
