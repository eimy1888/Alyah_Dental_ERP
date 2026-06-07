import { useState, useEffect } from 'react';
import { 
  FileText, Pill, Activity, Receipt, CreditCard, 
  Eye, X, Calendar, Filter, ChevronDown, File
} from 'lucide-react';
import { getMedicalRecords, getMedicalRecordDetail } from '../../services/patientService';

const recordIcons = {
  prescription: <Pill className="w-5 h-5" />,
  clinical_note: <FileText className="w-5 h-5" />,
  xray: <Activity className="w-5 h-5" />,
  invoice: <Receipt className="w-5 h-5" />,
  payment: <CreditCard className="w-5 h-5" />,
};

const recordColors = {
  prescription: 'bg-blue-100 text-blue-600',
  clinical_note: 'bg-amber-100 text-amber-600',
  xray: 'bg-purple-100 text-purple-600',
  invoice: 'bg-green-100 text-green-600',
  payment: 'bg-emerald-100 text-emerald-600',
};

const recordLabels = {
  prescription: 'Prescription',
  clinical_note: 'Clinical Note',
  xray: 'X-Ray',
  invoice: 'Invoice',
  payment: 'Payment',
};

const RECORD_TYPES = [
  { value: 'all', label: 'All Records' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'clinical_note', label: 'Clinical Notes' },
  { value: 'xray', label: 'X-Rays' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment', label: 'Payments' },
];

export default function PatientMedicalRecords() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, prescriptions: 0, clinical_notes: 0, xrays: 0, invoices: 0, payments: 0 });
  const [loading, setLoading] = useState(true);
  const [recordType, setRecordType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToastMessage = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      const params = {};
      if (recordType !== 'all') params.type = recordType;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      
      const data = await getMedicalRecords(params);
      setRecords(data.records || []);
      setSummary(data.summary || { total: 0, prescriptions: 0, clinical_notes: 0, xrays: 0, invoices: 0, payments: 0 });
    } catch (error) {
      console.error('Failed to load medical records:', error);
      showToastMessage('Failed to load medical records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicalRecords();
  }, [recordType, fromDate, toDate]);

  const handleViewDetail = async (type, id) => {
    try {
      const data = await getMedicalRecordDetail(type, id);
      setSelectedRecord(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load record details:', error);
      showToastMessage('Failed to load record details', 'error');
    }
  };

  const clearFilters = () => {
    setRecordType('all');
    setFromDate('');
    setToDate('');
  };

  const formatCurrency = (amount) => {
    return `ETB ${amount?.toLocaleString() || 0}`;
  };

  const renderDetailContent = () => {
    if (!selectedRecord) return null;

    switch (selectedRecord.type) {
      case 'prescription':
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-blue-50">
              <p className="text-xs text-gray-500 mb-1">Medication</p>
              <p className="text-base font-semibold text-gray-900">{selectedRecord.details.medication}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Dosage</p>
                <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.dosage}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Duration</p>
                <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.duration_days} days</p>
              </div>
            </div>
            {selectedRecord.details.instructions && (
              <div className="p-4 rounded-xl bg-amber-50">
                <p className="text-xs font-semibold text-amber-700 mb-1">Instructions</p>
                <p className="text-sm text-amber-800">{selectedRecord.details.instructions}</p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Issued Date</p>
              <p className="text-sm text-gray-900">{selectedRecord.details.issued_at}</p>
            </div>
          </div>
        );

      case 'clinical_note':
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50">
              <p className="text-xs text-gray-500 mb-1">Note Type</p>
              <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.note_type}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Content</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRecord.details.content}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${selectedRecord.details.is_signed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {selectedRecord.details.is_signed ? 'Signed' : 'Unsigned'}
              </span>
              {selectedRecord.details.signed_at && (
                <span className="text-xs text-gray-400">Signed: {selectedRecord.details.signed_at}</span>
              )}
            </div>
          </div>
        );

      case 'xray':
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-purple-50">
              <p className="text-xs text-gray-500 mb-1">Study Type</p>
              <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.study_type}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.status}</p>
            </div>
            {selectedRecord.details.findings && (
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Findings</p>
                <p className="text-sm text-gray-700">{selectedRecord.details.findings}</p>
              </div>
            )}
            {selectedRecord.details.file_url && (
              <a href={selectedRecord.details.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm">
                <File className="w-4 h-4" /> View X-Ray Image
              </a>
            )}
          </div>
        );

      case 'invoice':
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-green-50">
              <p className="text-xs text-gray-500 mb-1">Invoice Number</p>
              <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.invoice_number}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Total</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(selectedRecord.details.total)}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Balance Due</p>
                <p className="text-sm font-bold text-amber-600">{formatCurrency(selectedRecord.details.balance_due)}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Due Date</p>
              <p className="text-sm text-gray-900">{selectedRecord.details.due_date || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                selectedRecord.details.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {selectedRecord.details.status?.toUpperCase()}
              </span>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-emerald-50">
              <p className="text-xs text-gray-500 mb-1">Amount Paid</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedRecord.details.amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{selectedRecord.details.payment_method}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Reference</p>
                <p className="text-sm text-gray-600">{selectedRecord.details.reference || '—'}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Payment Date</p>
              <p className="text-sm text-gray-900">{selectedRecord.details.paid_at}</p>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">No details available</p>;
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold bg-red-500 text-white">
          {toast.message}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${recordColors[selectedRecord.type]} flex items-center justify-center`}>
                  {recordIcons[selectedRecord.type]}
                </div>
                <div>
                  <p className="text-xs text-gray-400">{recordLabels[selectedRecord.type]}</p>
                  <h3 className="text-base font-bold text-gray-900">{selectedRecord.title}</h3>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedRecord.date}</span>
                </div>
              </div>
              {renderDetailContent()}
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Patient Portal
        </p>
        <h1 className="text-3xl font-bold text-gray-900">My Medical Records</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete health timeline including prescriptions, clinical notes, X-rays, and billing.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: summary.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Prescriptions', value: summary.prescriptions, color: 'bg-blue-100 text-blue-700' },
          { label: 'Clinical Notes', value: summary.clinical_notes, color: 'bg-amber-100 text-amber-700' },
          { label: 'X-Rays', value: summary.xrays, color: 'bg-purple-100 text-purple-700' },
          { label: 'Invoices', value: summary.invoices, color: 'bg-green-100 text-green-700' },
          { label: 'Payments', value: summary.payments, color: 'bg-emerald-100 text-emerald-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none"
          >
            {RECORD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="From"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="To"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
          />
        </div>
        <button onClick={clearFilters} className="px-4 py-2 rounded-xl text-sm text-blue-600 hover:bg-blue-50">
          Clear Filters
        </button>
      </div>

      {/* Records Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Medical Records Timeline</h2>
          <p className="text-xs text-gray-400">{records.length} records found</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No medical records found with the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map((record, index) => (
              <div
                key={`${record.type}-${record.id}-${index}`}
                className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleViewDetail(record.type, record.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${recordColors[record.type]} flex items-center justify-center shrink-0`}>
                    {recordIcons[record.type]}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{record.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">
                          {recordLabels[record.type]}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">{record.date}</span>
                        <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                    
                    {/* Tags/Additional Info */}
                    {record.type === 'prescription' && record.details?.dosage && (
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                        {record.details.dosage}
                      </span>
                    )}
                    {record.type === 'clinical_note' && record.details?.is_signed !== undefined && (
                      <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${record.details.is_signed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {record.details.is_signed ? 'Signed' : 'Unsigned'}
                      </span>
                    )}
                    {record.type === 'invoice' && record.details?.balance_due > 0 && (
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                        Balance: {formatCurrency(record.details.balance_due)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}