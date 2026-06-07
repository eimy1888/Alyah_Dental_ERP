import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CreditCard, ShieldCheck, Zap, TrendingUp, ArrowUpRight, Loader2, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { getClinics, getPlatformAnalytics } from '../../services/platformService';
import {
  StatCardGradient, SectionCard, PageHeader, StatusBadge, DataTable,
} from '../../components/ui/DashCard';

const healthIndicators = [
  { label: 'API response time',   value: '142ms',  badge: 'p95 latency',        badgeColor: 'bg-blue-50 text-blue-600 border-blue-100' },
  { label: 'Failed logins (24h)', value: '3',      badge: 'No anomalies',       badgeColor: 'bg-green-50 text-green-700 border-green-100' },
  { label: 'Storage used',        value: '1.2 TB', badge: '60% of capacity',    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100' },
  { label: 'Scheduled jobs',      value: '100%',   badge: 'All queues healthy', badgeColor: 'bg-green-50 text-green-700 border-green-100' },
];

const statusColors = {
  active:                    'active',
  pending_platform_approval: 'pending',
  suspended:                 'cancelled',
  rejected:                  'cancelled',
  pending_payment:           'confirmed',
};
const statusLabel = {
  active:                    'Active',
  pending_platform_approval: 'Pending',
  suspended:                 'Suspended',
  rejected:                  'Rejected',
  pending_payment:           'Pending Payment',
};

const PLAN_COLORS = { enterprise: 'bg-blue-500', pro: 'bg-green-500', basic: 'bg-amber-400' };

const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 };

export default function PlatformDashboard() {
  const [clinics,   setClinics]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [cRes, aRes] = await Promise.all([getClinics(), getPlatformAnalytics()]);
      setClinics(cRes.data || []);
      setAnalytics(aRes.data || null);
    } catch { setError('Failed to load dashboard data.'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="rounded-2xl bg-red-50 border border-red-100 p-8 text-center max-w-md mx-auto">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button onClick={fetchAll} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Try Again</button>
      </div>
    </div>
  );

  const kpis = analytics ? [
    { gradient: 'blue',   label: 'Total Clinics',       icon: Building2,  value: analytics.kpis.total_active_clinics,       sub: `${clinics.filter(c => c.status === 'active').length} active` },
    { gradient: 'green',  label: 'MRR',                 icon: CreditCard, value: analytics.kpis.current_mrr_formatted,      sub: `${analytics.kpis.mrr_growth_pct >= 0 ? '+' : ''}${analytics.kpis.mrr_growth_pct}% vs last month` },
    { gradient: 'amber',  label: 'Pending Approvals',   icon: ShieldCheck, value: String(analytics.kpis.pending_approvals).padStart(2, '0'), sub: 'Awaiting review' },
    { gradient: 'violet', label: 'SLA Uptime',          icon: Zap,        value: '99.98%',                                   sub: 'Last 30 days' },
  ] : [];

  const pendingClinics = clinics.filter(c => c.status === 'pending_platform_approval').slice(0, 5);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Platform Admin"
        title="Platform Command Center"
        subtitle="Control clinic growth, subscriptions, approvals, and SaaS-wide metrics."
        actions={
          <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => (
          <StatCardGradient key={k.label} gradient={k.gradient} label={k.label} icon={k.icon} value={k.value} sub={k.sub} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Tenant Growth" subtitle="Cumulative active clinics — last 7 months">
          <div className="p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analytics?.tenant_growth || []} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v) => [v, 'Total clinics']} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="url(#barGrad)" />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007BFF" />
                    <stop offset="100%" stopColor="#00D4FF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="MRR Trend" subtitle="Monthly recurring revenue — last 7 months">
          <div className="p-5">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={analytics?.mrr_trend || []}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#007BFF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#007BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}K`, 'MRR']} />
                <Area type="monotone" dataKey="mrr" stroke="#007BFF" strokeWidth={2} fill="url(#mrrGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Plan Mix + Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Plan mix */}
        <SectionCard title="Plan Mix" subtitle="Active subscription distribution">
          <div className="p-5">
            {!analytics?.plan_mix?.length ? (
              <p className="text-sm text-gray-400">No plan data available.</p>
            ) : (() => {
              const total = analytics.plan_mix.reduce((s, p) => s + p.count, 0);
              return (
                <div className="space-y-5">
                  {analytics.plan_mix.map(p => (
                    <div key={p.plan_id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-gray-700">{p.name}</span>
                        <span className="text-[13px] font-bold text-gray-900">{p.count} clinic{p.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${PLAN_COLORS[p.slug] || 'bg-gray-400'} rounded-full transition-all duration-700`}
                          style={{ width: total > 0 ? `${(p.count / total) * 100}%` : '0%' }} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">${p.monthly_price}/mo · ${p.annual_price}/mo annual</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </SectionCard>

        {/* Pending approvals */}
        <SectionCard title="Pending Approvals"
          action={<Link to="/platform/approvals" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700">View all →</Link>}>
          <div className="p-5">
            {pendingClinics.length === 0 ? (
              <div className="text-center py-6">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-gray-400">All caught up! No pending approvals.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingClinics.map(clinic => (
                  <div key={clinic.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-[13px] font-bold text-gray-900">{clinic.name}</p>
                      <StatusBadge status={statusColors[clinic.status] ?? 'pending'} label={statusLabel[clinic.status]} />
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">{clinic.owner} · {clinic.plan ?? '—'} · {clinic.city}</p>
                    <Link to="/platform/approvals"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors">
                      Review →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Clinic portfolio + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard title="Clinic Portfolio" subtitle={`${clinics.length} total tenants`}
          action={<Link to="/platform/clinics" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors">View all →</Link>}>
          <DataTable headers={['Clinic', 'Owner', 'Plan', 'City', 'Status']}>
            {clinics.slice(0, 5).map(c => (
              <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-gray-900">{c.name}</td>
                <td className="px-5 py-3.5 text-gray-500">{c.owner}</td>
                <td className="px-5 py-3.5 text-gray-500">{c.plan ?? '—'}</td>
                <td className="px-5 py-3.5 text-gray-500">{c.city}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={statusColors[c.status] ?? 'pending'} label={statusLabel[c.status] ?? c.status} />
                </td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard title="Platform Health" subtitle="Infrastructure indicators">
          <div className="p-5 grid grid-cols-2 gap-3">
            {healthIndicators.map(item => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                <p className="text-[22px] font-black text-gray-900 mb-2">{item.value}</p>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>{item.badge}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
