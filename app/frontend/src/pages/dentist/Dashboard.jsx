import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Activity, FileText, AlertTriangle,
  CheckCircle, Clock, TrendingUp, ChevronRight,
  Eye, Users, ArrowRight, Phone, X,
} from 'lucide-react';
import {
  getDashboard, updateAppointmentStatus, signClinicalNote,
  getDentistQueue, callNextPatient, setRecall,
} from '../../services/dentistService';
import ReferralModal from '../../components/dentist/ReferralModal';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  StatCardGradient, SectionCard, PageHeader, StatusBadge, DataTable,
  SkeletonCard, EmptyState, PageWrapper,
} from '../../components/ui/DashCard';
import { useToast } from '../../components/ui/Toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const statusColors = {
  pending:'pending', confirmed:'confirmed', checked_in:'checked_in',
  in_progress:'in_progress', completed:'completed', no_show:'no_show', cancelled:'cancelled',
};
const statusLabels = {
  pending:'Pending', confirmed:'Confirmed', checked_in:'Checked In',
  in_progress:'In Progress', completed:'Completed', no_show:'No Show', cancelled:'Cancelled',
};

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', cornerRadius: 10, padding: 10 } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', fontSize: 11 } },
    x: { grid: { display: false }, ticks: { color: '#94a3b8', fontSize: 11 } },
  },
};

export default function DentistDashboard() {
  const { success, error: toastError } = useToast();
  const [dashboard,     setDashboard]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [queue,         setQueue]         = useState(null);
  const [queueLoading,  setQueueLoading]  = useState(false);
  const [callingNext,   setCallingNext]   = useState(false);
  const [recallModal,   setRecallModal]   = useState(null);
  const [recallMonths,  setRecallMonths]  = useState(6);
  const [recallNotes,   setRecallNotes]   = useState('');
  const [settingRecall, setSettingRecall] = useState(false);
  const [referralModal, setReferralModal] = useState(null);

  const showToast = (message, type = 'success') => {
    if (type === 'error') toastError(message);
    else success(message);
  };

  const loadDashboard = useCallback(async () => {
    try { setLoading(true); setDashboard(await getDashboard()); }
    catch { showToast('Failed to load dashboard data', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadQueue = useCallback(async () => {
    try { setQueueLoading(true); const d = await getDentistQueue(); setQueue(d.data ?? d); }
    catch {}
    finally { setQueueLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); loadQueue(); }, [loadDashboard, loadQueue]);

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    if (newStatus === 'completed') {
      const appt = (dashboard?.my_appointments_today ?? []).find(a => a.id === appointmentId);
      setRecallModal({ appointmentId, patientName: appt?.patient_name || 'Patient' });
      return;
    }
    setActionLoading(appointmentId);
    try { await updateAppointmentStatus(appointmentId, { status: newStatus }); showToast(`Appointment marked as ${newStatus}`); loadDashboard(); }
    catch { showToast('Failed to update appointment status', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleSignNote = async (noteId) => {
    setActionLoading(`note-${noteId}`);
    try { await signClinicalNote(noteId); showToast('Clinical note signed successfully'); loadDashboard(); }
    catch { showToast('Failed to sign note', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleCallNext = async () => {
    setCallingNext(true);
    try { const r = await callNextPatient(); showToast(r.message || 'Next patient called'); loadQueue(); loadDashboard(); }
    catch (e) { showToast(e?.response?.data?.message || 'Failed to call next patient', 'error'); }
    finally { setCallingNext(false); }
  };

  const handleSetRecall = async () => {
    if (!recallModal) return;
    setSettingRecall(true);
    try {
      await updateAppointmentStatus(recallModal.appointmentId, { status: 'completed' });
      const r = await setRecall(recallModal.appointmentId, { recall_interval_months: recallMonths, notes: recallNotes || undefined });
      showToast(r.message || 'Recall set successfully');
      setRecallModal(null); setRecallNotes(''); setRecallMonths(6);
      loadDashboard(); loadQueue();
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to set recall', 'error'); }
    finally { setSettingRecall(false); }
  };

  const handleSkipRecall = async () => {
    if (!recallModal) return;
    setSettingRecall(true);
    try {
      await updateAppointmentStatus(recallModal.appointmentId, { status: 'completed' });
      showToast('Appointment completed');
      setRecallModal(null); setRecallNotes(''); setRecallMonths(6);
      loadDashboard(); loadQueue();
    } catch { showToast('Failed to complete appointment', 'error'); }
    finally { setSettingRecall(false); }
  };

  const getActionButton = apt => {
    const btns = {
      confirmed: { label: 'Check In',  handler: 'checked_in',  cls: 'from-teal-500 to-teal-600' },
      checked_in: { label: 'Start',    handler: 'in_progress', cls: 'from-violet-500 to-violet-600' },
      in_progress: { label: 'Complete', handler: 'completed',  cls: 'from-green-500 to-green-600' },
    };
    const b = btns[apt.status];
    if (!b) return null;
    return (
      <button onClick={() => handleStatusUpdate(apt.id, b.handler)}
        disabled={actionLoading === apt.id}
        className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${b.cls} text-white text-[11px] font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50`}>
        {actionLoading === apt.id ? '…' : b.label}
      </button>
    );
  };

  if (loading) return (
    <div className="space-y-7">
      <PageHeader eyebrow="Dentist Workspace" title="Dashboard" subtitle="Loading…" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  );
  if (!dashboard) return <EmptyState title="Unable to load dashboard" description="Please refresh the page." />;

  const appointmentsToday   = dashboard.my_appointments_today   ?? [];
  const recentPrescriptions = dashboard.recent_prescriptions    ?? [];
  const unsignedNotesList   = dashboard.unsigned_notes_list     ?? [];
  const caseloadThisWeek    = dashboard.my_caseload_this_week   ?? [];
  const queueItems          = queue?.queue                      ?? [];

  const chartData = {
    labels: caseloadThisWeek.map(i => i.day),
    datasets: [{
      label: 'Patients', data: caseloadThisWeek.map(i => i.count),
      backgroundColor: 'rgba(0,123,255,0.85)',
      borderRadius: 8, borderSkipped: false,
    }],
  };

  return (
    <PageWrapper className="space-y-7">
      {/* Recall modal */}
      {recallModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-[15px] font-black text-gray-900">Set Recall</h3>
              <button onClick={() => { setRecallModal(null); setRecallNotes(''); setRecallMonths(6); }}
                className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-gray-600">Set follow-up for <span className="font-bold">{recallModal.patientName}</span>.</p>
              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Recall Interval</label>
                <select value={recallMonths} onChange={e => setRecallMonths(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 bg-white">
                  {[1,3,6,9,12,18,24].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Notes (optional)</label>
                <textarea value={recallNotes} onChange={e => setRecallNotes(e.target.value)}
                  placeholder="e.g., Regular checkup, crown review…" rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSkipRecall} disabled={settingRecall}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Skip
              </button>
              <button onClick={handleSetRecall} disabled={settingRecall}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {settingRecall ? 'Saving…' : 'Set Recall'}
              </button>
            </div>
          </div>
        </div>
      )}

      {referralModal && (
        <ReferralModal appointment={referralModal} onClose={() => setReferralModal(null)}
          onSuccess={() => { loadDashboard(); loadQueue(); }} />
      )}

      <PageHeader
        eyebrow="Dentist Workspace"
        title="Dashboard"
        subtitle="Move from appointments to charts, x-rays, and prescriptions in one focused workspace."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardGradient gradient="blue"   label="My Patients Today"    icon={Calendar}   value={dashboard.my_patients_today ?? 0}   sub={`${dashboard.urgent_consults ?? 0} urgent consults`} />
        <StatCardGradient gradient="violet" label="Cases In Progress"    icon={Activity}   value={dashboard.cases_in_progress ?? 0}   sub="Active treatment" />
        <StatCardGradient gradient="amber"  label="Unsigned Notes"       icon={FileText}   value={dashboard.unsigned_notes ?? 0}      sub="Needs sign-off" />
        <StatCardGradient gradient="green"  label="Treatment Acceptance" icon={TrendingUp} value="74%"                                sub="+6% vs last month" />
      </div>

      {/* Live Queue */}
      <SectionCard title="My Live Queue"
        subtitle={`${queue?.total ?? 0} patients · ${queue?.waiting ?? 0} waiting · ${queue?.in_progress ?? 0} in progress`}
        action={
          <button onClick={handleCallNext} disabled={callingNext || !queueItems.some(q => q.status === 'waiting')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm">
            {callingNext
              ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Calling…</>
              : <><ArrowRight className="w-3.5 h-3.5" /> Call Next</>
            }
          </button>
        }>
        {queueLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : queueItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-9 h-9 mx-auto mb-2 text-gray-300" />
            <p className="text-[13px]">No patients in queue.</p>
          </div>
        ) : (
          <DataTable headers={['#', 'Patient', 'Type', 'Wait', 'Status']}>
            {queueItems.map(item => (
              <tr key={item.id} className={`${item.status === 'in_progress' ? 'bg-green-50/40' : ''} ${item.priority === 'emergency' ? 'bg-red-50/40' : ''}`}>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black
                    ${item.priority === 'emergency' ? 'bg-red-500 text-white' : item.status === 'in_progress' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {item.position}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-bold text-gray-900 text-[13px]">{item.patient_name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Phone className="w-3 h-3" /> {item.patient_phone || '—'}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-gray-600">{item.appointment_type || 'Walk-in'}</td>
                <td className="px-5 py-3.5 text-[12px] font-semibold text-gray-500">{item.wait_minutes} min</td>
                <td className="px-5 py-3.5">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full
                    ${item.status === 'in_progress' ? 'bg-green-100 text-green-700'
                      : item.priority === 'emergency' ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'}`}>
                    {item.status === 'in_progress' ? 'In Progress' : item.priority === 'emergency' ? 'EMERGENCY' : 'Waiting'}
                  </span>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Caseload chart + Dental chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard className="lg:col-span-2" title="My Caseload This Week" subtitle="Daily patient count for clinical planning">
          <div className="p-5 h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </SectionCard>

        <SectionCard title="Active Dental Chart"
          action={<button className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1">Full Chart <ChevronRight className="w-3 h-3" /></button>}>
          <div className="p-4">
            <div className="grid grid-cols-8 gap-1 mb-1.5">
              {[18,17,16,15,14,13,12,11].map(t => (
                <div key={t} className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors">{t}</div>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1 mb-4">
              {[21,22,23,24,25,26,27,28].map(t => (
                <div key={t} className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors">{t}</div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { color: 'bg-red-500',   label: 'Caries',       sub: 'Composite planned' },
                { color: 'bg-green-500', label: 'Crown seated',  sub: 'Completed' },
                { color: 'bg-amber-500', label: 'RCT follow-up', sub: 'Review in 2 weeks' },
              ].map(({ color, label, sub }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-[12px] font-semibold text-gray-700">{label}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Today's appointments table */}
      <SectionCard title="My Appointments Today" subtitle="Scheduled patients with type, status, and actions">
        <DataTable headers={['Time', 'Patient', 'Type', 'Status', 'Actions', 'Refer']} empty="No appointments scheduled for today.">
          {appointmentsToday.map(appt => (
            <tr key={appt.id} className="hover:bg-gray-50/70 transition-colors">
              <td className="px-5 py-3.5 font-black text-gray-900">{appt.time}</td>
              <td className="px-5 py-3.5">
                <p className="font-bold text-gray-900">{appt.patient_name}</p>
                <p className="text-[10px] text-gray-400">ID: PAT-{String(appt.patient_id).padStart(4, '0')}</p>
              </td>
              <td className="px-5 py-3.5 text-gray-600">{appt.type}</td>
              <td className="px-5 py-3.5"><StatusBadge status={statusColors[appt.status]} label={statusLabels[appt.status]} /></td>
              <td className="px-5 py-3.5">{getActionButton(appt)}</td>
              <td className="px-5 py-3.5">
                {!['completed','cancelled','no_show'].includes(appt.status) && (
                  <button onClick={() => setReferralModal(appt)}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 text-[11px] font-bold hover:bg-blue-50 transition-colors">
                    Refer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      {/* Prescriptions + Unsigned notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Recent Prescriptions"
          action={<Link to="/dentist/medical-records" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>}>
          <div className="p-4 space-y-2.5">
            {!recentPrescriptions.length
              ? <p className="text-[13px] text-gray-400 text-center py-4">No recent prescriptions.</p>
              : recentPrescriptions.map(presc => (
                  <div key={presc.id} className="flex items-start justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{presc.medication}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{presc.patient_name} · {presc.issued_at}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{presc.dosage}</p>
                    </div>
                    <Eye className="w-4 h-4 text-gray-300 cursor-pointer hover:text-blue-600 transition-colors mt-1" />
                  </div>
                ))
            }
          </div>
        </SectionCard>

        <SectionCard title="Unsigned Clinical Notes"
          action={<Link to="/dentist/medical-records" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>}>
          <div className="p-4 space-y-2.5">
            {!unsignedNotesList.length
              ? <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100"><CheckCircle className="w-4 h-4 text-green-500" /><p className="text-[13px] font-semibold text-green-700">All notes are signed.</p></div>
              : unsignedNotesList.map(note => (
                  <div key={note.id} className="flex items-start justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex-1 mr-3">
                      <p className="text-[13px] font-bold text-gray-900">{note.patient_name}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">{note.content_snippet}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{note.note_type} · {new Date(note.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleSignNote(note.id)} disabled={actionLoading === `note-${note.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-bold hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50">
                      {actionLoading === `note-${note.id}` ? '…' : 'Sign'}
                    </button>
                  </div>
                ))
            }
          </div>
        </SectionCard>
      </div>
    </PageWrapper>
  );
}
