import { useState, useEffect, useCallback } from 'react';
import { Search, Download, ChevronDown, X, Calendar as CalendarIcon } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getRevenue, exportRevenue } from '../../services/accountantService';
import { getFilters } from '../../services/accountantService';

ChartJS.register(ArcElement, Tooltip, Legend);

const payerMixColors = {
  private: '#1F4E79',
  insurance: '#059669',
  telebirr_chapa: '#F59E0B',
  bank_transfer: '#8B5CF6',
  cash: '#10B981',
};

const payerMixLabels = {
  private: 'Private Pay',
  insurance: 'Insurance',
  telebirr_chapa: 'Telebirr / Chapa',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
};

export default function AccountantRevenue() {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('weekly');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFilters = useCallback(async () => {
    try {
      const data = await getFilters();
      setBranches(data.branches || []);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        period,
        ...(selectedBranch !== 'all' && { branch_id: selectedBranch }),
      };
      const data = await getRevenue(params);
      setRevenue(data);
    } catch (error) {
      console.error('Failed to load revenue:', error);
      showToast('Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  }, [period, selectedBranch]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const handleExport = async () => {
    try {
      await exportRevenue();
      showToast('Export started. Download will be ready shortly.');
    } catch (error) {
      showToast('Failed to export', 'error');
    }
  };

  // Payer Mix Chart Data
  const payerMixData = revenue?.payer_mix ? {
    labels: Object.keys(revenue.payer_mix).map(key => payerMixLabels[key]),
    datasets: [{
      data: Object.values(revenue.payer_mix),
      backgroundColor: Object.keys(revenue.payer_mix).map(key => payerMixColors[key]),
      borderWidth: 0,
    }],
  } : null;

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` } },
    },
  };

  const formatCurrency = (amount) => {
    return `ETB ${amount?.toLocaleString() || 0}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
            Revenue Analytics
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Branch performance, payer mix, and revenue trends across the clinic network.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Branch:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Total Revenue Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80 mb-1">Total Revenue ({period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month'})</p>
        <p className="text-4xl font-bold">{formatCurrency(revenue?.total_revenue)}</p>
      </div>

      {/* Revenue Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Revenue Ledger</h2>
          <p className="text-xs text-gray-400">Branch-wise revenue breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">BRANCH</th>
                <th className="px-6 py-3 text-right text-xs font-bold tracking-widest text-gray-400">COLLECTED</th>
                <th className="px-6 py-3 text-right text-xs font-bold tracking-widest text-gray-400">PENDING</th>
                <th className="px-6 py-3 text-right text-xs font-bold tracking-widest text-gray-400">CLAIMS</th>
                <th className="px-6 py-3 text-right text-xs font-bold tracking-widest text-gray-400">GROWTH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {revenue?.revenue_ledger?.map((branch) => (
                <tr key={branch.branch_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{branch.branch_name}</td>
                  <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(branch.collected)}</td>
                  <td className="px-6 py-4 text-right text-amber-600">{formatCurrency(branch.pending)}</td>
                  <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(branch.claims)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${branch.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {branch.growth >= 0 ? '+' : ''}{branch.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                <td className="px-6 py-4 text-right font-bold text-green-700">
                  {formatCurrency(revenue?.revenue_ledger?.reduce((sum, b) => sum + b.collected, 0))}
                </td>
                <td className="px-6 py-4 text-right font-bold text-amber-700">
                  {formatCurrency(revenue?.revenue_ledger?.reduce((sum, b) => sum + b.pending, 0))}
                </td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">
                  {formatCurrency(revenue?.revenue_ledger?.reduce((sum, b) => sum + b.claims, 0))}
                </td>
                <td className="px-6 py-4"></td>
               </tr>
            </tfoot>
           </table>
        </div>
      </div>

      {/* Payer Mix + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payer Mix Donut Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Payer Mix</h2>
          <p className="text-xs text-gray-400 mb-4">Revenue distribution by payment method</p>
          <div className="h-64">
            {payerMixData ? (
              <Pie data={payerMixData} options={pieOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Revenue Trend</h2>
          <p className="text-xs text-gray-400 mb-4">{period.charAt(0).toUpperCase() + period.slice(1)} revenue over time</p>
          <div className="h-64">
            {revenue?.revenue_chart?.length > 0 ? (
              <div className="flex items-end gap-2 h-full">
                {revenue.revenue_chart.map((item, idx) => {
                  const maxRevenue = Math.max(...revenue.revenue_chart.map(i => i.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700" style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }} />
                      <span className="text-xs text-gray-400 rotate-45 origin-left whitespace-nowrap">{item.label}</span>
                      <span className="text-[10px] font-semibold text-gray-600">{formatCurrency(item.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}