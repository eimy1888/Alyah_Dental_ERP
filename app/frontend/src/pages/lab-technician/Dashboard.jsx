import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Clock, Loader2, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { getLabDashboard } from '../../services/labService';

const statusColors = {
  pending:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  sent_to_lab: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  ready:       'bg-green-100 text-green-700 border-green-200',
  delivered:   'bg-gray-100 text-gray-600 border-gray-200',
  cancelled:   'bg-red-100 text-red-600 border-red-200',
};

const statusLabels = {
  pending:     'Pending',
  sent_to_lab: 'Sent to Lab',
  in_progress: 'In Progress',
  ready:       'Ready',
  delivered:   'Delivered',
  cancelled:   'Cancelled',
};

function KpiCard({ icon: Icon, label, value, color, highlight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border p-5 flex items-center gap-4 shadow-sm ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className={`text-2xl font-black ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-[12px] text-gray-500 mt-0.5">{label}</p>
        {highlight && value > 0 && (
          <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Needs attention
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function LabDashboard() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLabDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.14em]">Lab Technician</p>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Dashboard</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Overview of lab orders and workload</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FlaskConical}
          label="Pending Orders"
          value={data?.pending_count ?? 0}
          color="bg-yellow-500"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Due Today"
          value={data?.due_today ?? 0}
          color="bg-red-500"
          highlight={(data?.due_today ?? 0) > 0}
        />
        <KpiCard
          icon={Loader2}
          label="In Progress"
          value={data?.in_progress_count ?? 0}
          color="bg-purple-500"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed This Week"
          value={data?.completed_this_week ?? 0}
          color="bg-green-500"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[14px] font-black text-gray-900">Recent Orders</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Last 5 lab orders</p>
          </div>
          <button
            onClick={() => navigate('/lab/orders')}
            className="flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {!data?.recent_orders?.length ? (
          <div className="py-12 text-center">
            <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400">No recent lab orders</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recent_orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="px-6 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer"
                onClick={() => navigate('/lab/orders')}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[13px] font-bold text-gray-900 truncate">{order.lab_order_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500">
                      {order.patient_name} • {order.order_type?.replace(/_/g, ' ')} {order.material ? `(${order.material})` : ''}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Dr. {order.ordering_dentist}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {order.expected_ready_date && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Due {new Date(order.expected_ready_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
