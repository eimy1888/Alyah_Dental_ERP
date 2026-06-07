import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Download, Calendar, TrendingUp, 
  DollarSign, Users, AlertCircle, ChevronRight,
  Plus, X, Save, Clock, CheckCircle, Lock
} from 'lucide-react';
import { 
  getReportTypes, generateReport, getGeneratedReports,
  getFiscalYears, getPeriods, closePeriod, createFiscalYear
} from '../../services/accountantService';

// ─────────────────────────────────────────────────────────────
// REPORT CARD COMPONENT
// ─────────────────────────────────────────────────────────────
function ReportCard({ report, onGenerate, generating }) {
  const icons = {
    revenue_performance: <TrendingUp className="w-8 h-8 text-blue-600" />,
    expense_analysis: <DollarSign className="w-8 h-8 text-red-600" />,
    dentist_productivity: <Users className="w-8 h-8 text-purple-600" />,
    insurance_claims: <FileText className="w-8 h-8 text-amber-600" />,
    accounts_receivable: <Clock className="w-8 h-8 text-orange-600" />,
    tax_summary: <AlertCircle className="w-8 h-8 text-green-600" />,
    expiry_alert: <AlertCircle className="w-8 h-8 text-red-600" />,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            {icons[report.type] || <FileText className="w-6 h-6 text-gray-500" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{report.label}</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md">{report.description}</p>
          </div>
        </div>
        <button
          onClick={() => onGenerate(report.type)}
          disabled={generating === report.type}
          className="px-4 py-2 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 flex items-center gap-2"
        >
          {generating === report.type ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {generating === report.type ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GENERATED REPORTS LIST
// ─────────────────────────────────────────────────────────────
function GeneratedReportsList({ reports, loading }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No reports generated yet. Click "Generate" to create your first report.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div key={report.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900 capitalize">{report.type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-400">Generated: {formatDate(report.generated_at)}</p>
            </div>
          </div>
          <a href={report.file_url} className="text-sm text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1">
            Download <Download className="w-3 h-3" />
          </a>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FISCAL YEAR PERIODS TABLE
// ─────────────────────────────────────────────────────────────
function PeriodsTable({ periods, fiscalYear, onClosePeriod, closingPeriod }) {
  const formatCurrency = (amount) => `ETB ${amount?.toLocaleString() || 0}`;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">{fiscalYear?.name} - Periods</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${fiscalYear?.is_closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {fiscalYear?.is_closed ? 'Closed' : 'Active'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest text-gray-400">PERIOD</th>
              <th className="px-4 py-3 text-right text-xs font-bold tracking-widest text-gray-400">REVENUE</th>
              <th className="px-4 py-3 text-right text-xs font-bold tracking-widest text-gray-400">EXPENSES</th>
              <th className="px-4 py-3 text-right text-xs font-bold tracking-widest text-gray-400">NET</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest text-gray-400">STATUS</th>
              <th className="px-4 py-3 text-center text-xs font-bold tracking-widest text-gray-400">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{period.month} {period.year}</td>
                <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(period.revenue)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatCurrency(period.expenses)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(period.net)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${period.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {period.status === 'closed' ? 'Closed' : 'Open'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {period.status === 'open' && !fiscalYear?.is_closed && (
                    <button
                      onClick={() => onClosePeriod(period.id)}
                      disabled={closingPeriod === period.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-50"
                    >
                      {closingPeriod === period.id ? '...' : 'Close Period'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
              <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(periods.reduce((sum, p) => sum + p.revenue, 0))}</td>
              <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(periods.reduce((sum, p) => sum + p.expenses, 0))}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(periods.reduce((sum, p) => sum + p.net, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW FISCAL YEAR MODAL
// ─────────────────────────────────────────────────────────────
function NewFiscalYearModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });

  const handleSubmit = () => {
    if (!form.name || !form.start_date || !form.end_date) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Create New Fiscal Year</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fiscal Year Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., FY 2026-2027"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Fiscal Year'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN REPORTS COMPONENT
// ─────────────────────────────────────────────────────────────
export default function AccountantReports() {
  const [activeTab, setActiveTab] = useState('studio');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState(null);
  const [generating, setGenerating] = useState(null);

  // Reports Studio
  const [reportTypes, setReportTypes] = useState([]);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Fiscal Year
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [showNewFiscalYearModal, setShowNewFiscalYearModal] = useState(false);
  const [loadingFiscal, setLoadingFiscal] = useState(true);

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Reports Studio data
  const loadReportTypes = useCallback(async () => {
    try {
      const data = await getReportTypes();
      setReportTypes(data);
    } catch (error) {
      console.error('Failed to load report types:', error);
      showToastMessage('Failed to load report types', 'error');
    }
  }, []);

  const loadGeneratedReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const response = await getGeneratedReports();
      setGeneratedReports(response.data || []);
    } catch (error) {
      console.error('Failed to load generated reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // Load Fiscal Year data
  const loadFiscalYears = useCallback(async () => {
    try {
      setLoadingFiscal(true);
      const data = await getFiscalYears();
      setFiscalYears(data.fiscal_years || []);
      if (data.current_year && !selectedFiscalYear) {
        setSelectedFiscalYear(data.current_year);
        loadPeriods(data.current_year.id);
      }
    } catch (error) {
      console.error('Failed to load fiscal years:', error);
      showToastMessage('Failed to load fiscal years', 'error');
    } finally {
      setLoadingFiscal(false);
    }
  }, []);

  const loadPeriods = useCallback(async (fiscalYearId) => {
    try {
      const data = await getPeriods(fiscalYearId);
      setPeriods(data.periods || []);
    } catch (error) {
      console.error('Failed to load periods:', error);
      showToastMessage('Failed to load periods', 'error');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'studio') {
      loadReportTypes();
      loadGeneratedReports();
    } else {
      loadFiscalYears();
    }
  }, [activeTab, loadReportTypes, loadGeneratedReports, loadFiscalYears]);

  const handleGenerateReport = async (reportType) => {
    setGenerating(reportType);
    try {
      await generateReport({ type: reportType, parameters: { generated_at: new Date().toISOString() } });
      showToastMessage('Report generation started. You will be notified when ready.');
      loadGeneratedReports();
    } catch (error) {
      showToastMessage('Failed to generate report', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const handleClosePeriod = async (periodId) => {
    setClosingPeriod(periodId);
    try {
      await closePeriod(periodId);
      showToastMessage('Period closed successfully');
      if (selectedFiscalYear) {
        loadPeriods(selectedFiscalYear.id);
        loadFiscalYears();
      }
    } catch (error) {
      showToastMessage('Failed to close period', 'error');
    } finally {
      setClosingPeriod(null);
    }
  };

  const handleCreateFiscalYear = async (data) => {
    setSaving(true);
    try {
      await createFiscalYear(data);
      showToastMessage('Fiscal year created successfully');
      setShowNewFiscalYearModal(false);
      loadFiscalYears();
    } catch (error) {
      showToastMessage('Failed to create fiscal year', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFiscalYearChange = (yearId) => {
    const year = fiscalYears.find(y => y.id === parseInt(yearId));
    setSelectedFiscalYear(year);
    loadPeriods(yearId);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {showNewFiscalYearModal && (
        <NewFiscalYearModal
          onClose={() => setShowNewFiscalYearModal(false)}
          onSave={handleCreateFiscalYear}
          saving={saving}
        />
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Analytics & Compliance
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate financial reports and manage fiscal periods.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['studio', 'fiscal-year'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'studio' ? 'Reports Studio' : 'Fiscal Year'}
          </button>
        ))}
      </div>

      {/* REPORTS STUDIO TAB */}
      {activeTab === 'studio' && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {reportTypes.map((report) => (
              <ReportCard
                key={report.type}
                report={report}
                onGenerate={handleGenerateReport}
                generating={generating}
              />
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Previously Generated Reports</h2>
              <p className="text-xs text-gray-400">Download reports from previous generations</p>
            </div>
            <div className="p-6">
              <GeneratedReportsList reports={generatedReports} loading={loadingReports} />
            </div>
          </div>
        </>
      )}

      {/* FISCAL YEAR TAB */}
      {activeTab === 'fiscal-year' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Select Fiscal Year:</label>
              <select
                value={selectedFiscalYear?.id || ''}
                onChange={(e) => handleFiscalYearChange(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 outline-none"
                disabled={loadingFiscal}
              >
                {loadingFiscal ? (
                  <option>Loading...</option>
                ) : (
                  fiscalYears.map((year) => (
                    <option key={year.id} value={year.id}>{year.name} ({year.start_date} to {year.end_date})</option>
                  ))
                )}
              </select>
            </div>
            <button
              onClick={() => setShowNewFiscalYearModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900"
            >
              <Plus className="w-4 h-4" /> New Fiscal Year
            </button>
          </div>

          {periods.length > 0 && selectedFiscalYear && (
            <PeriodsTable
              periods={periods}
              fiscalYear={selectedFiscalYear}
              onClosePeriod={handleClosePeriod}
              closingPeriod={closingPeriod}
            />
          )}
        </>
      )}
    </div>
  );
}