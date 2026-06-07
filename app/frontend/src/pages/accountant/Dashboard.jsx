import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Users, FileText, Calendar, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement,
  PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getDashboard } from '../../services/accountantService';
import {
  StatCardGradient, SectionCard, PageHeader, StatusBadge, DataTable,
} from '../../components/ui/DashCard';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const claimStatusColors = {
  draft:'draft', submitted:'confirmed', approved:'completed', rejected:'cancelled', paid:'completed',
};

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#94a3b8', padding: 10, cornerRadius: 10 },
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', fontSize: 11 } },
    x: { grid: { display: false }, ticks: { color: '#94a3b8', fontSize: 11 } },
  },
};

const formatCurrency = amount => `ETB ${amount?.toLocaleString() || 0}`;

export default function AccountantDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);

  const showToast = (message, type = 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setDashboard(data);
    } catch { showToast('Failed to load dashboard data', 'error'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!dashboard) return <div className="text-center py-12 text-gray-500">Unable to load dashboard data.</div>;

  const revChartData = {
    labels: dashboard.revenue_trend?.map(i => i.month) || [],
    datasets: [{
      label: 'Revenue', data: dashboard.revenue_trend?.map(i => i.revenue) || [],
      borderColor: '#007BFF', backgroundColor: 'rgba(0,123,255,0.07)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#007BFF',
    }],
  };
  const expChartData = {
    labels: dashboard.expense_trend?.map(i => i.month) || [],
    datasets: [{
      label: 'Expenses', data: dashboard.expense_trend?.map(i => i.expenses) || [],
      borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.07)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ef4444',
    }],
  };

  return (
    <div className="space-y-7">
      {toast && (
        <div className={`fixed top-20 right-5 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      <PageHeader
        eyebrow="Finance Dashboard"
        title="Financial Overview"
        subtitle="Real-time financial metrics, revenue trends, and outstanding obligations."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardGradient gradient="green"  label="Collected Today"  icon={DollarSign} value={formatCurrency(dashboard.collected_today?.amount)}
          sub={`${dashboard.collected_today?.percent_change > 0 ? '+' : ''}${dashboard.collected_today?.percent_change || 0}% vs yesterday`} />
        <StatCardGradient gradient="amber"  label="Outstanding AR"   icon={TrendingUp}  value={formatCurrency(dashboard.outstanding_ar?.amount)}
          sub={`${dashboard.outstanding_ar?.overdue_accounts_count || 0} overdue accounts`} />
        <StatCardGradient gradient="blue"   label="Payroll Run"      icon={Users}       value={`${dashboard.payroll_run?.staff_count || 0} staff`}
          sub={`Due in ${dashboard.payroll_run?.due_days || 0} days`} />
        <StatCardGradient gradient="violet" label="Claims Pending"   icon={FileText}    value={dashboard.claims_pending?.count || 0}
          sub={`${dashboard.claims_pending?.need_docs_count || 0} need documents`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Revenue Trend"
          action={<span className="text-[11px] font-semibold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">↑ 12% this quarter</span>}>
          <div className="p-5 h-64"><Line data={revChartData} options={chartOptions} /></div>
        </SectionCard>
        <SectionCard title="Expense Trend"
          action={<span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">↓ 3% vs last month</span>}>
          <div className="p-5 h-64"><Line data={expChartData} options={chartOptions} /></div>
        </SectionCard>
      </div>

      {/* Invoice ledger */}
      <SectionCard title="Invoice Ledger" subtitle="Recent invoices requiring attention"
        action={<Link to="/accountant/billing" className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>}>
        <DataTable headers={['Invoice', 'Patient', 'Total', 'Balance', 'Status', 'Due Date']} empty="No invoices found.">
          {dashboard.invoice_ledger?.map(inv => (
            <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
              <td className="px-5 py-3.5 font-mono text-[12px] text-gray-500">{inv.invoice_number}</td>
              <td className="px-5 py-3.5 font-semibold text-gray-900">{inv.patient_name}</td>
              <td className="px-5 py-3.5 font-bold text-gray-900">{formatCurrency(inv.total)}</td>
              <td className="px-5 py-3.5 font-bold text-amber-600">{formatCurrency(inv.balance)}</td>
              <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
              <td className="px-5 py-3.5 text-gray-400 text-[12px]">{inv.due_date}</td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      {/* Payments + Claims + Tax */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <SectionCard title="Recent Payments">
          <div className="p-4 space-y-2.5">
            {!dashboard.recent_payments?.length
              ? <p className="text-sm text-gray-400 text-center py-4">No recent payments.</p>
              : dashboard.recent_payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{p.patient_name}</p>
                      <p className="text-[11px] text-gray-400">{p.method} · {p.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-black text-green-600">{formatCurrency(p.amount)}</p>
                      <p className="text-[10px] text-gray-400">{p.invoice_number}</p>
                    </div>
                  </div>
                ))
            }
          </div>
        </SectionCard>

        <SectionCard title="Insurance Claims">
          <div className="p-4 space-y-2.5">
            {!dashboard.insurance_claims_recent?.length
              ? <p className="text-sm text-gray-400 text-center py-4">No recent claims.</p>
              : dashboard.insurance_claims_recent.map(claim => (
                  <div key={claim.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{claim.patient_name}</p>
                      <p className="text-[11px] text-gray-400">{claim.provider}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-gray-900">{formatCurrency(claim.amount)}</p>
                      <StatusBadge status={claimStatusColors[claim.status] ?? 'draft'} label={claim.status} />
                    </div>
                  </div>
                ))
            }
          </div>
        </SectionCard>

        <SectionCard title="Tax Center">
          <div className="p-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 mb-4">
              <p className="text-[11px] text-gray-500 mb-1 font-medium">VAT Payable</p>
              <p className="text-[28px] font-black text-amber-700">{formatCurrency(dashboard.tax_center?.vat_payable)}</p>
            </div>
            <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-3">Upcoming Obligations</p>
            {!dashboard.tax_center?.upcoming_taxes?.length
              ? <p className="text-[12px] text-gray-400">No upcoming taxes.</p>
              : <div className="space-y-2">
                  {dashboard.tax_center.upcoming_taxes.map(tax => (
                    <div key={tax.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[12px] font-semibold text-gray-700">{tax.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-bold text-gray-900">{formatCurrency(tax.amount)}</p>
                        <p className="text-[10px] text-gray-400">Due {tax.due_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
