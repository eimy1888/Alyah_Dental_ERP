import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Users, TrendingUp, AlertTriangle,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle,
  Loader2, Package,
} from 'lucide-react';
import apiClient from '../../services/axiosInstance';
import {
  StatCardGradient, SectionCard, PageHeader, StatusBadge, DataTable, RefreshBtn,
} from '../../components/ui/DashCard';

const fmt  = n => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n) + ' ETB';
const fmtS = n => {
  if (n >= 1_000_000) return `ETB ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `ETB ${(n / 1_000).toFixed(0)}K`;
  return `ETB ${n}`;
};export default function ClinicAdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiClient.get('/admin/dashboard');
      setData(res.data.data);
    } catch { setError('Failed to load dashboard data. Please refresh.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="rounded-2xl bg-red-50 border border-red-100 p-8 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button onClick={fetchDashboard} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );

  const m     = data?.metrics           || {};
  const trend = data?.appointment_trend || [];
  const maxVal= Math.max(...trend.map(t => t.count), 1);

  const activityFeed = [
    ...(m.overdue_invoices > 0 ? [{ icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-100', text: `${m.overdue_invoices} overdue invoice${m.overdue_invoices > 1 ? 's' : ''} need attention`, time: 'Today' }] : []),
    ...(m.low_stock_count > 0  ? [{ icon: Package,     color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', text: `${m.low_stock_count} inventory item${m.low_stock_count > 1 ? 's' : ''} below threshold`, time: 'Today' }] : []),
    { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 border-green-100', text: `${m.today_appointments ?? 0} appointments scheduled today`, time: 'Today' },
    { icon: Clock,        color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-100',  text: `${m.new_patients_week ?? 0} new patients this week`, time: 'This week' },
  ].slice(0, 5);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Clinic Admin"
        title="Dashboard"
        subtitle="Clinic-wide overview — appointments, revenue, patients & alerts."
        actions={<RefreshBtn onClick={fetchDashboard} />}
      />

      {/* KPI gradient cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/appointments">
          <StatCardGradient gradient="blue" label="Today's Appointments" icon={CalendarDays}
            value={m.today_appointments ?? 0}
            sub={`${m.pending_appointments ?? 0} pending confirmation`} />
        </Link>
        <Link to="/admin/finance">
          <StatCardGradient gradient="green" label="MTD Revenue" icon={TrendingUp}
            value={fmtS(m.mtd_revenue ?? 0)}
            sub={`ETB ${fmt(m.outstanding_ar ?? 0)} outstanding`} />
        </Link>
        <Link to="/admin/patients">
          <StatCardGradient gradient="violet" label="Active Patients" icon={Users}
            value={(m.active_patients ?? 0).toLocaleString()}
            sub={`+${m.new_patients_week ?? 0} new this week`} />
        </Link>
        <Link to="/admin/inventory">
          <StatCardGradient gradient="amber" label="Low Stock Alerts" icon={AlertTriangle}
            value={m.low_stock_count ?? 0}
            sub={`${m.critical_stock_count ?? 0} critical items`} />
        </Link>
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Appointment trend */}
        <SectionCard className="lg:col-span-2" title="Appointment Trend" subtitle="Last 7 days">
          <div className="p-6">
            {trend.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No appointment data yet.</div>
            ) : (
              <div className="flex items-end gap-2.5 h-44">
                {trend.map(t => (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="relative w-full flex flex-col justify-end" style={{ height: 144 }}>
                      {t.count > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded-lg shadow-sm border border-gray-100">
                          {t.count}
                        </span>
                      )}
                      <div className="w-full rounded-t-xl transition-all duration-500"
                        style={{
                          height: `${Math.max((t.count / maxVal) * 100, t.count > 0 ? 6 : 0)}%`,
                          background: 'linear-gradient(180deg, #007BFF 0%, #00D4FF 100%)',
                          opacity: t.count > 0 ? 1 : 0.25,
                        }} />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400">{t.day}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Activity */}
        <SectionCard title="Activity Feed" subtitle="Clinic alerts & updates">
          <div className="p-5 space-y-3">
            {activityFeed.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No alerts today.</p>
              : activityFeed.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${item.bg}`}>
                      <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-gray-700 leading-snug">{item.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </SectionCard>
      </div>

      {/* Financial Exposure + Invoice Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Financial exposure */}
        <SectionCard title="Patient Financial Exposure"
          action={<Link to="/admin/billing" className="text-[12px] text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>}>
          {!data?.financial_exposure?.length ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm text-gray-400">No outstanding balances.</p>
            </div>
          ) : (
            <DataTable headers={['Patient', 'Outstanding', 'Risk']}>
              {data.financial_exposure.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{row.patient}</p>
                    <p className="text-[11px] text-gray-400">{row.invoice_number}</p>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{fmt(row.outstanding)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={row.risk} /></td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>

        {/* Invoice monitor */}
        <SectionCard title="Invoice Monitoring"
          action={<Link to="/admin/billing" className="text-[12px] text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>}>
          {!data?.recent_invoices?.length ? (
            <div className="p-8 text-center text-sm text-gray-400">No invoices yet.</div>
          ) : (
            <DataTable headers={['Invoice', 'Amount', 'Status']}>
              {data.recent_invoices.map((inv, i) => (
                <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{inv.invoice_number}</p>
                    <p className="text-[11px] text-gray-400">{inv.patient} · {inv.branch}</p>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{fmt(inv.amount)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>

      {/* Low stock alert strip */}
      {data?.low_stock_items?.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-amber-900">Low Stock Alert</p>
                <p className="text-[11px] text-amber-700">{data.low_stock_items.length} item{data.low_stock_items.length > 1 ? 's' : ''} need reorder</p>
              </div>
            </div>
            <Link to="/admin/inventory" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.low_stock_items.map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                <p className="text-[13px] font-bold text-gray-800 mb-1">{item.name}</p>
                <p className="text-[11px] text-amber-600 mb-2">{item.current_quantity} left · threshold {item.reorder_threshold}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                    style={{ width: `${Math.min((item.current_quantity / item.reorder_threshold) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
