import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, CalendarDays, Package, Loader2, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import apiClient from '../../services/axiosInstance';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const RANGES = [
  { label: 'Last 7 days',  value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 3 months',value: '3m' },
];

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between shadow-sm">
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}

export default function ManagerReports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [range,   setRange]   = useState('30d');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/manager/reports', { params: { range } });
        setData(res.data.data);
        
      } catch {
        setError('Failed to load reports.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Branch Manager
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-1">
              Branch performance — appointments, patients, and inventory.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Range selector */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    range === r.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Appointments"
          value={data?.summary?.total_appointments ?? 0}
          sub={`${data?.summary?.completed_appointments ?? 0} completed`}
          icon={CalendarDays}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Patients"
          value={data?.summary?.total_patients ?? 0}
          sub={`+${data?.summary?.new_patients ?? 0} new`}
          icon={Users}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Completion Rate"
          value={`${data?.summary?.completion_rate ?? 0}%`}
          sub="of scheduled appointments"
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          label="Low Stock Items"
          value={data?.summary?.low_stock_count ?? 0}
          sub="need reorder"
          icon={Package}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Appointments over time */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Appointments Over Time</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Daily appointment volume for selected period.</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.appointments_chart ?? []}>
              <defs>
                <linearGradient id="apptGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12,
                }}
                formatter={(v) => [v, 'Appointments']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#apptGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Appointment status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Status Breakdown</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Appointment outcomes for selected period.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.status_chart ?? []} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Appointment types pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-900">Appointment Types</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Distribution by treatment type.</p>
          {(data?.type_chart ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.type_chart ?? []}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ type, percent }) =>
                    `${type} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(data?.type_chart ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12, border: 'none',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* New patients over time */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-900">New Patients</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">New patient registrations over time.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.patients_chart ?? []} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12,
                }}
                formatter={(v) => [v, 'New Patients']}
              />
              <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory summary table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Inventory Summary</h2>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['ITEM', 'SKU', 'CURRENT QTY', 'THRESHOLD', 'STATUS'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.inventory_summary ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  No inventory data.
                </td>
              </tr>
            ) : (
              (data?.inventory_summary ?? []).map((item) => {
                const isLow = item.current_quantity <= item.reorder_threshold;
                const isOut = item.current_quantity <= 0;
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900 text-xs">{item.name}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono">{item.sku ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                        {item.current_quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{item.reorder_threshold}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isOut ? 'bg-red-50 text-red-700 border border-red-200' :
                        isLow ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}