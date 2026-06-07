import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, UserRound, Package, CheckCircle2, Clock, AlertTriangle, TrendingUp, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import apiClient from '../../services/axiosInstance';
import useAuthStore from '../../store/authStore';
import {
  StatCardGradient, SectionCard, PageHeader, StatusBadge, DataTable,
} from '../../components/ui/DashCard';

const statusColors = {
  pending:'pending', confirmed:'confirmed', checked_in:'checked_in',
  in_progress:'in_progress', completed:'completed', no_show:'no_show', cancelled:'cancelled',
};
const statusLabel = {
  pending:'Pending', confirmed:'Confirmed', checked_in:'Checked In',
  in_progress:'In Progress', completed:'Completed', no_show:'No Show', cancelled:'Cancelled',
};

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError('');
        const res = await apiClient.get('/manager/dashboard');
        setData(res.data?.data ?? res.data);
      } catch { setError('Failed to load dashboard data. Please try again.'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
  if (error) return (
    <div className="p-6">
      <div className="rounded-2xl bg-red-50 border border-red-100 p-8 text-center max-w-md mx-auto">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Branch Manager"
        title={data?.branch?.name ?? 'Dashboard'}
        subtitle={`${data?.branch?.location ? data.branch.location + ' · ' : ''}${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link to="/manager/appointments">
          <StatCardGradient gradient="blue"   label="Today's Appointments" icon={CalendarDays} value={data?.today_appointments ?? 0} sub={`${data?.completed_today ?? 0} completed`} />
        </Link>
        <Link to="/manager/appointments">
          <StatCardGradient gradient="amber"  label="Pending Today"        icon={Clock}       value={data?.pending_today ?? 0}        sub="awaiting check-in" />
        </Link>
        <Link to="/manager/patients">
          <StatCardGradient gradient="green"  label="Total Patients"       icon={UserRound}   value={data?.total_patients ?? 0}       sub={`+${data?.new_patients_month ?? 0} this month`} />
        </Link>
        <Link to="/manager/inventory">
          <StatCardGradient gradient="rose"   label="Low Stock Alerts"     icon={Package}     value={data?.low_stock_count ?? 0}      sub="items need reorder" />
        </Link>
      </div>

      {/* Chart + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard className="lg:col-span-2" title="Appointments — Last 7 Days" subtitle="Daily appointment volume for this branch">
          <div className="p-5">
            {(!data?.weekly_appointments?.length) ? (
              <div className="flex items-center justify-center h-44 text-gray-400 text-sm">No appointment data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.weekly_appointments} barSize={24}>
                  <defs>
                    <linearGradient id="mgrBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007BFF" /><stop offset="100%" stopColor="#00D4FF" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day"   tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis               tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }} cursor={{ fill: '#f8fafc' }} formatter={v => [v, 'Appointments']} />
                  <Bar dataKey="count" fill="url(#mgrBarGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Today's Status" subtitle="Appointment breakdown">
          <div className="p-5">
            {!Object.keys(data?.status_breakdown ?? {}).length ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-[12px]">No appointments today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.status_breakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                    <StatusBadge status={statusColors[status] ?? status} label={statusLabel[status] ?? status} />
                    <span className="text-[14px] font-black text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Schedule + Alerts + Recent patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard title="Today's Schedule" subtitle={`${data?.today_schedule?.length ?? 0} appointments`}
          action={<Link to="/manager/appointments" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700">View all →</Link>}>
          {!data?.today_schedule?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No appointments scheduled today</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.today_schedule.slice(0, 6).map(appt => (
                <div key={appt.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-[12px] font-black text-gray-900">{appt.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{appt.patient_name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{appt.dentist_name} · {appt.type}</p>
                  </div>
                  <StatusBadge status={statusColors[appt.status] ?? appt.status} label={statusLabel[appt.status] ?? appt.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          {/* Stock alerts */}
          <SectionCard title="Low Stock Alerts"
            action={<Link to="/manager/inventory" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700">View all →</Link>}>
            {!data?.stock_alerts?.length ? (
              <div className="flex items-center gap-3 px-5 py-4 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-[13px] font-semibold">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.stock_alerts.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{item.name}</p>
                      <p className="text-[11px] text-gray-400">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-black text-red-600">{item.current_quantity} {item.unit}</p>
                      <p className="text-[10px] text-gray-400">min: {item.reorder_threshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent patients */}
          <SectionCard title="Recent Patients"
            action={<Link to="/manager/patients" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700">View all →</Link>}>
            {!data?.recent_patients?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <UserRound className="w-7 h-7 mb-2 opacity-30" />
                <p className="text-sm">No recent patients</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recent_patients.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-[11px] font-black shrink-0">
                      {(p.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-400">{p.phone}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 shrink-0">{p.joined}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
