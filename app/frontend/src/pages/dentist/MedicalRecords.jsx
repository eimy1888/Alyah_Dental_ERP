import { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  FileText,
  Activity,
  History,
  Eye,
  X,
} from 'lucide-react';
import { getMedicalRecords, getMedicalRecordDetail, getPatients } from '../../services/dentistService';

const RECORD_TYPES = [
  { value: 'all', label: 'All Records', icon: null },
  { value: 'prescription', label: 'Prescriptions', icon: FileText },
  { value: 'xray', label: 'X-Rays', icon: Activity },
  { value: 'clinical_note', label: 'Clinical Notes', icon: History },
  { value: 'appointment', label: 'Appointments', icon: CalendarIcon },
];

const typeIcons = {
  prescription: <FileText className="w-4 h-4" />,
  xray: <Activity className="w-4 h-4" />,
  clinical_note: <History className="w-4 h-4" />,
  appointment: <CalendarIcon className="w-4 h-4" />,
};

const typeColors = {
  prescription: 'bg-blue-100 text-blue-600',
  xray: 'bg-purple-100 text-purple-600',
  clinical_note: 'bg-amber-100 text-amber-600',
  appointment: 'bg-green-100 text-green-600',
};

export default function DentistMedicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [recordType, setRecordType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [summary, setSummary] = useState({ total: 0, prescriptions: 0, xrays: 0, clinical_notes: 0, appointments: 0 });
  const [patients, setPatients] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMedicalRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedPatientId) params.patient_id = selectedPatientId;
      if (recordType !== 'all') params.type = recordType;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      
      const data = await getMedicalRecords(params);
      setRecords(data.records || []);
      setSummary(data.summary || { total: 0, prescriptions: 0, xrays: 0, clinical_notes: 0, appointments: 0 });
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Failed to load medical records:', error);
      showToast('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId, recordType, fromDate, toDate]);

  useEffect(() => {
  loadMedicalRecords();
}, [selectedPatientId, recordType, fromDate, toDate]);

  const handlePatientSearch = async () => {
    if (!searchPatient.trim()) return;
    try {
      const response = await getPatients({ search: searchPatient, per_page: 10 });
      const results = response.data || [];
      if (results.length > 0) {
        setPatients(results);
        setShowPatientDropdown(true);
      } else {
        setShowPatientDropdown(false);
        showToast('No patients found with that name');
      }
    } catch (error) {
      console.error('Failed to search patients:', error);
      showToast('Failed to search patients');
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.first_name} ${patient.last_name}`);
    setSearchPatient('');
    setShowPatientDropdown(false);
  };

  const clearPatientFilter = () => {
    setSelectedPatientId(null);
    setSelectedPatientName('');
  };

  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const handleViewDetail = async (type, id) => {
    try {
      const data = await getMedicalRecordDetail(type, id);
      setSelectedRecord(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load record details:', error);
      showToast('Failed to load record details');
    }
  };

  const getRecordTypeLabel = (type) => {
    const found = RECORD_TYPES.find(t => t.value === type);
    return found ? found.label : type;
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${typeColors[selectedRecord.type]} flex items-center justify-center`}>
                  {typeIcons[selectedRecord.type]}
                </div>
                <div>
                  <p className="text-xs text-gray-400">{getRecordTypeLabel(selectedRecord.type)}</p>
                  <h3 className="text-base font-bold text-gray-900">{selectedRecord.description}</h3>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Patient</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedRecord.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedRecord.date}</p>
                </div>
              </div>
              
              {selectedRecord.type === 'prescription' && selectedRecord.details && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Medication</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.medication}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Dosage</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.dosage}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Duration</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.duration_days} days</p>
                  </div>
                  {selectedRecord.details.instructions && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Instructions</p>
                      <p className="text-sm text-gray-700">{selectedRecord.details.instructions}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedRecord.type === 'xray' && selectedRecord.details && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Study Type</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.study_type}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.status}</p>
                  </div>
                  {selectedRecord.details.findings && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Findings</p>
                      <p className="text-sm text-gray-700">{selectedRecord.details.findings}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedRecord.type === 'clinical_note' && selectedRecord.details && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Note Type</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.note_type}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Content</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRecord.details.content}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${selectedRecord.details.is_signed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedRecord.details.is_signed ? 'Signed' : 'Unsigned'}
                    </span>
                    {selectedRecord.details.signed_at && (
                      <span className="text-gray-400">Signed: {new Date(selectedRecord.details.signed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )}

              {selectedRecord.type === 'appointment' && selectedRecord.details && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.status}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Time</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRecord.details.time}</p>
                  </div>
                  {selectedRecord.details.notes && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{selectedRecord.details.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Dentist Workspace
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
        <p className="text-sm text-gray-500 mt-1">
          Unified timeline of prescriptions, x-rays, clinical notes, and appointments.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Records', value: summary.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Prescriptions', value: summary.prescriptions, color: 'bg-blue-100 text-blue-700' },
          { label: 'X-Rays', value: summary.xrays, color: 'bg-purple-100 text-purple-700' },
          { label: 'Clinical Notes', value: summary.clinical_notes, color: 'bg-amber-100 text-amber-700' },
          { label: 'Appointments', value: summary.appointments, color: 'bg-green-100 text-green-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          
          {/* Patient Search */}
          <div className="flex-1 relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Filter by Patient</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                {selectedPatientName ? (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50">
                    <span className="text-sm font-medium text-blue-700">{selectedPatientName}</span>
                    <button onClick={clearPatientFilter} className="p-1 rounded-lg hover:bg-blue-100">
                      <X className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search patient by name..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={handlePatientSearch}
                      className="px-4 py-2.5 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200"
                    >
                      Search
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Patient dropdown */}
            {showPatientDropdown && patients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-60 overflow-y-auto">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    {p.first_name} {p.last_name} - {p.phone || 'No phone'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Record Type Filter */}
          <div className="w-full md:w-48">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Record Type</label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              {RECORD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearDateFilters}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear Dates
            </button>
          </div>
        </div>
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
                  <div className={`w-10 h-10 rounded-xl ${typeColors[record.type]} flex items-center justify-center shrink-0`}>
                    {typeIcons[record.type]}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{record.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {record.patient_name} · {record.type === 'prescription' && record.details?.medication}
                          {record.type === 'xray' && `${record.details?.study_type}`}
                          {record.type === 'clinical_note' && `${record.details?.note_type}`}
                          {record.type === 'appointment' && `${record.details?.status}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">{record.date}</span>
                        <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                      </div>
                    </div>
                    
                    {/* Snippet for clinical notes */}
                    {record.type === 'clinical_note' && record.details?.content_snippet && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {record.details.content_snippet}
                      </p>
                    )}
                    
                    {/* Tags */}
                    <div className="flex gap-2 mt-2">
                      {record.type === 'prescription' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                          {record.details?.dosage}
                        </span>
                      )}
                      {record.type === 'clinical_note' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${record.details?.is_signed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {record.details?.is_signed ? 'Signed' : 'Unsigned'}
                        </span>
                      )}
                      {record.type === 'xray' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                          {record.details?.status}
                        </span>
                      )}
                    </div>
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