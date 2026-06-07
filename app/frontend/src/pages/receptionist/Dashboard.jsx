import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, CheckCircle, ListTodo, Receipt, Bell, RefreshCw } from 'lucide-react';
import { getDashboard, updateAppointmentStatus } from '../../services/receptionistService';
import {
  StatCardGradient, SectionCard, PageHeader, StatusBadge,
  DataTable, SkeletonCard, EmptyState, RefreshBtn, PageWrapper,
} from '../../components/ui/DashCard';
import { useToast } from '../../components/ui/Toast';

export default function ReceptionistDashboard() {
  const { success, error: toastError } = useToast();
  const [dashboard,  setDashboard]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch {
      toastError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const iv = setInterval(() => loadDashboard(), 30000);
    return () => clearInterval(iv);
  }, []);

  const handleCheckIn = async (id) => {
    try {
      await updateAppointmentStatus(id, 'checked_in');
      success('Patient checked in successfully.');
      loadDashboard();
    } catch {
      toastError('Check-in failed. Please try again.');
    }
  };

  const fmt = (n) => `ETB ${Number(n || 0).toLocaleString()}`;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <PageHeader eyebrow="Front Desk" title="Dashboard" subtitle="Loading…" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-12 px-6 flex items-center border-b border-gray-100">
              <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-12 px-6 flex items-center border-b border-gray-100">
              <div className="h-3 w-32 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 text-[14px]">Unable to load dashboard.</p>
          <button onClick={() => loadDashboard()} className="mt-3 text-blue-600 text-[13px] font-semibold hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-7">

      {/* Header */}
      <PageHeader
        eyebrow="Front Desk"
        title="Dashboard"
        subtitle="Today's overview — live queue, appointments, and recent activity."
        actions={
          <RefreshBtn onClick={() => loadDashboard(true)} spinning={refreshing} />
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Patients',  value: dashboard.patients_count,         icon: Users,      gradient: 'blue'   },
          { label: 'Appointments',    value: dashboard.appointments_today,      icon: Calendar,   gradient: 'teal'   },
          { label: 'Checked In',      value: dashboard.checked_in_count,        icon: CheckCircle,gradient: 'green'  },
          { label: 'Waitlist',        value: dashboard.waitlist_count,          icon: ListTodo,   gradient: 'violet' },
          { label: 'Invoices Today',  value: dashboard.invoices_printed_today,  icon: Receipt,    gradient: 'amber'  },
          { label: 'Notifications',   value: dashboard.unread_messages_count||0,icon: Bell,       gradient: 'rose'   },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.06, duration: 0.4, ease:[0.16,1,0.3,1] }}>
            <StatCardGradient gradient={m.gradient} label={m.label} icon={m.icon} value={m.value} animate />
          </motion.div>
        ))}
      </div>

      {/* Live queue + Today's appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard title="Live Queue" subtitle="Patients ready for treatment">
          <DataTable
            headers={['Patient', 'Dentist', 'Chair', 'Wait']}
            emptyType="queue"
            empty="Queue is empty"
          >
            {dashboard.live_queue?.map((q, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50/70 transition-colors"
              >
                <td className="px-5 py-3.5 font-semibold text-gray-900">{q.patient_name}</td>
                <td className="px-5 py-3.5 text-gray-600">{q.dentist_name}</td>
                <td className="px-5 py-3.5 text-gray-500">Chair {q.chair || i + 1}</td>
                <td className="px-5 py-3.5">
                  <span className="text-amber-600 font-semibold text-[12px]">{q.wait_time || '0 min'}</span>
                </td>
              </motion.tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard
          title="Today's Appointments"
          subtitle={`${dashboard.today_appointments?.length || 0} scheduled`}
        >
          <DataTable
            headers={['Time', 'Patient', 'Type', 'Status', 'Action']}
            emptyType="appointments"
          >
            {dashboard.today_appointments?.map((apt, i) => (
              <motion.tr
                key={apt.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50/70 transition-colors"
              >
                <td className="px-5 py-3.5 font-black text-gray-900">{apt.time}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{apt.patient_name}</td>
                <td className="px-5 py-3.5 text-gray-500 text-[12px]">{apt.type}</td>
                <td className="px-5 py-3.5"><StatusBadge status={apt.status} /></td>
                <td className="px-5 py-3.5">
                  {apt.status === 'confirmed' && (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleCheckIn(apt.id)}
                      className="px-3 py-1.5 rounded-xl text-white text-[11px] font-bold hover:opacity-90 transition-opacity shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#0d9488,#06b6d4)' }}
                    >
                      Check In
                    </motion.button>
                  )}
                  {apt.status === 'checked_in' && (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Checked in
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </DataTable>
        </SectionCard>
      </div>

      {/* Recent invoices + Patient quick view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard title="Recent Invoices">
          <DataTable
            headers={['Invoice', 'Patient', 'Total', 'Balance', 'Status']}
            emptyType="invoices"
          >
            {dashboard.recent_invoices?.map((inv, i) => (
              <motion.tr
                key={inv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="hover:bg-gray-50/70 transition-colors"
              >
                <td className="px-5 py-3.5 font-mono text-[12px] text-gray-500">{inv.invoice_number}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-800">{inv.patient_name}</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">{fmt(inv.total)}</td>
                <td className="px-5 py-3.5 font-semibold text-amber-600">{fmt(inv.balance)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
              </motion.tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard title="Patient Quick View">
          {!dashboard.patient_quick_view?.length ? (
            <EmptyState type="patients" title="No recent patients" />
          ) : (
            <div className="p-5 space-y-2.5">
              {dashboard.patient_quick_view.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)' }}
                    >
                      {p.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{p.name}</p>
                      <p className="text-[11px] text-gray-400">Next: {p.next_appointment || 'No upcoming'}</p>
                    </div>
                  </div>
                  <p className="text-[13px] font-black text-amber-600">{fmt(p.balance)}</p>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

    </PageWrapper>
  );
}
