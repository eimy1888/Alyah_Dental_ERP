import { useState, useEffect } from 'react';
import { Eye, X, Receipt, CreditCard, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getPatientInvoices, getInvoiceSummary } from '../../services/patientService';

const statusColors = {
  paid: 'bg-green-100 text-green-700 border border-green-200',
  partial: 'bg-amber-100 text-amber-700 border border-amber-200',
  sent: 'bg-blue-100 text-blue-700 border border-blue-200',
  overdue: 'bg-red-100 text-red-700 border border-red-200',
  draft: 'bg-gray-100 text-gray-500 border border-gray-200',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const statusLabels = {
  paid: 'Paid',
  partial: 'Partial',
  sent: 'Sent',
  overdue: 'Overdue',
  draft: 'Draft',
  cancelled: 'Cancelled',
};

function DetailModal({ invoice, onClose }) {
  const [expanded, setExpanded] = useState(true);

  const formatCurrency = (amount) => `ETB ${amount?.toLocaleString() || 0}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <p className="text-xs text-gray-400 font-mono">{invoice.invoice_number}</p>
            <h3 className="text-base font-bold text-gray-900">Invoice Details</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Status and Amount */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[invoice.status]}`}>
              {statusLabels[invoice.status]}
            </span>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Issued Date</p>
              <p className="text-sm font-semibold text-gray-800">{invoice.issued_at}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="text-sm font-semibold text-gray-800">{invoice.due_date || '—'}</p>
            </div>
          </div>

          {/* Payment Status */}
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-semibold text-gray-800">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Paid Amount</span>
              <span className="font-semibold text-green-600">{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-semibold text-amber-600">{formatCurrency(invoice.balance)}</span>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between py-2 text-left"
            >
              <p className="text-sm font-semibold text-gray-900">Invoice Items</p>
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-2">
                {invoice.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-2 border-b border-gray-50">
                    <div>
                      <p className="text-gray-700">{item.description}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                    </div>
                    <span className="font-semibold text-gray-800">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                {(!invoice.items || invoice.items.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No items in this invoice</p>
                )}
              </div>
            )}
          </div>

          {/* Payments Section */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Payment History</p>
              <div className="space-y-2">
                {invoice.payments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-2 border-b border-gray-50">
                    <div>
                      <p className="text-gray-700 capitalize">{payment.method}</p>
                      <p className="text-xs text-gray-400">{payment.paid_at}</p>
                      {payment.reference && <p className="text-xs text-gray-400">Ref: {payment.reference}</p>}
                    </div>
                    <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note for unpaid invoices */}
          {invoice.status !== 'paid' && invoice.balance > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-700">
                  Please visit the reception to complete payment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientBilling() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, unpaid: 0, overdue: 0, total_amount: 0, total_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const showToastMessage = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = { page, per_page: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await getPatientInvoices(params);
      setInvoices(response.data || []);
      setPagination({
        current_page: response.meta?.current_page || 1,
        last_page: response.meta?.last_page || 1,
        total: response.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load invoices:', error);
      showToastMessage('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await getInvoiceSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadSummary();
  }, [statusFilter, page]);

  const formatCurrency = (amount) => `ETB ${amount?.toLocaleString() || 0}`;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {selectedInvoice && (
        <DetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Patient Portal
        </p>
        <h1 className="text-3xl font-bold text-gray-900">My Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          View your invoices, payments, and outstanding balances.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: summary.total, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
          { label: 'Paid', value: summary.paid, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
          { label: 'Unpaid', value: summary.unpaid, icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Overdue', value: summary.overdue, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.color} rounded-2xl p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className="w-5 h-5 opacity-70" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Amount Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Amount Billed</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_amount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Outstanding Balance</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.total_balance)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none focus:border-blue-400"
        >
          <option value="all">All Invoices</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="sent">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
        <p className="text-sm text-gray-500">
          {pagination.total} invoice{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No invoices found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-mono text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[inv.status]}`}>
                          {statusLabels[inv.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-gray-600">{inv.issued_at}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Total:</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(inv.total)}</span>
                        </div>
                        {inv.balance > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Balance:</span>
                            <span className="font-semibold text-amber-600">{formatCurrency(inv.balance)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Page {pagination.current_page} of {pagination.last_page}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}