import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Search, Eye, CheckCircle2, XCircle, FileText, Loader2, Copy, Check } from 'lucide-react';
import { getClinics, approveClinic, rejectClinic } from '../../services/platformService';
import useApprovalsStore from '../../store/approvalsStore';

const statusColors = {
  pending_platform_approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  active:                    'bg-green-50 text-green-700 border border-green-200',
  rejected:                  'bg-red-50 text-red-700 border border-red-200',
  suspended:                 'bg-gray-100 text-gray-500 border border-gray-200',
  pending_payment:           'bg-blue-50 text-blue-700 border border-blue-200',
};

const statusLabel = {
  pending_platform_approval: 'Pending',
  active:                    'Approved',
  rejected:                  'Rejected',
  suspended:                 'Suspended',
  pending_payment:           'Pending Payment',
};

const planColors = {
  Basic:      'bg-gray-100 text-gray-600',
  Pro:        'bg-blue-50 text-blue-700',
  Enterprise: 'bg-purple-50 text-purple-700',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

// ── Temp Password Modal ───────────────────────────────────────────────────────
function TempPasswordModal({ clinicName, email, password, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">

        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5">
          <p className="text-green-100 text-xs font-semibold tracking-widest uppercase">
            Clinic Approved
          </p>
          <h2 className="text-white text-xl font-bold mt-0.5">
            Admin Account Created
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            A clinic admin account was created for{' '}
            <span className="font-semibold text-gray-900">{clinicName}</span>.
            Share these credentials with the clinic owner — the password cannot be retrieved later.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Login Email
              </p>
              <p className="text-sm font-mono font-semibold text-gray-800">{email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Temporary Password
              </p>
              <div className="flex items-center gap-3">
                <p className="text-sm font-mono font-bold text-gray-900 tracking-widest">
                  {password}
                </p>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  {copied
                    ? <><Check className="w-3 h-3" /> Copied</>
                    : <><Copy className="w-3 h-3" /> Copy</>
                  }
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-amber-500 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-700">
              Also, a <strong>Main Branch</strong> has been automatically created using the clinic's
              registered address. The clinic admin can update branch details from their dashboard.
              Ask the admin to change their password after first login.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Done — I've noted the credentials
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlatformApprovals() {
  const { setClinics: setGlobalClinics } = useApprovalsStore();
  const { t } = useTranslation('platform');

  const [clinics,   setClinics]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [selected,  setSelected]  = useState(null);
  const [actionId,  setActionId]  = useState(null);
  const [rejectId,  setRejectId]  = useState(null);
  const [reason,    setReason]    = useState('');
  const [toast,     setToast]     = useState('');
  const [tempCreds, setTempCreds] = useState(null); // { clinicName, email, password }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getClinics();
        const all = res.data || [];
        setClinics(all);
        setGlobalClinics(all);
      } catch {
        setError('Failed to load approval queue.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setGlobalClinics(clinics);
  }, [clinics, setGlobalClinics]);

  const handleApprove = async (id) => {
    try {
      setActionId(id);
      const res = await approveClinic(id);

      // Update local state
      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c))
      );
      if (selected?.id === id) {
        setSelected((s) => ({ ...s, status: 'active' }));
      }

      // If backend created a new admin account, show credentials
      if (res.temp_password) {
        const clinic = clinics.find((c) => c.id === id);
        setTempCreds({
          clinicName: clinic?.name ?? 'Clinic',
          email:      clinic?.email ?? '',
          password:   res.temp_password,
        });
      } else {
        showToast('Clinic approved successfully.');
      }
    } catch {
      showToast('Failed to approve clinic.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      setActionId(rejectId);
      await rejectClinic(rejectId, reason);
      setClinics((prev) =>
        prev.map((c) => (c.id === rejectId ? { ...c, status: 'rejected' } : c))
      );
      if (selected?.id === rejectId) {
        setSelected((s) => ({ ...s, status: 'rejected' }));
      }
      showToast('Clinic rejected.');
    } catch {
      showToast('Failed to reject clinic.');
    } finally {
      setActionId(null);
      setRejectId(null);
      setReason('');
    }
  };

  const filtered = clinics.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.owner?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ||
      (filter === 'Pending'  && c.status === 'pending_platform_approval') ||
      (filter === 'Approved' && c.status === 'active') ||
      (filter === 'Rejected' && c.status === 'rejected');
    return matchSearch && matchFilter;
  });

  const counts = {
    pending:  clinics.filter((c) => c.status === 'pending_platform_approval').length,
    approved: clinics.filter((c) => c.status === 'active').length,
    rejected: clinics.filter((c) => c.status === 'rejected').length,
    payment:  clinics.filter((c) => c.status === 'pending_payment').length,
  };

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
    <div className="p-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Temp password modal */}
      {tempCreds && (
        <TempPasswordModal
          clinicName={tempCreds.clinicName}
          email={tempCreds.email}
          password={tempCreds.password}
          onClose={() => { setTempCreds(null); showToast('Clinic approved successfully.'); }}
        />
      )}

      {/* Reject reason modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Reject Clinic</h3>
            <p className="text-sm text-gray-500">
              Provide a reason for rejection. This will be visible to the clinic owner.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Missing tax document, invalid trade license..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-300 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectId(null); setReason(''); }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!reason.trim() || actionId === rejectId}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {actionId === rejectId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          {t('platformAdmin')}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('approvals')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review submitted registrations, verify documents, and approve or reject clinic tenants.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Review',  value: counts.pending,  color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Payment', value: counts.payment,  color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Approved',        value: counts.approved, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rejected',        value: counts.rejected, color: 'text-red-600',   bg: 'bg-red-50'   },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4 border border-white`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search clinic or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none cursor-pointer"
        >
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Table + Detail panel */}
      <div className="flex gap-4">

        {/* Table */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {['CLINIC', 'OWNER', 'PLAN', 'CITY', 'SUBMITTED', 'STATUS', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                      selected?.id === c.id ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.owner}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planColors[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.plan ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.created_at ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[c.status]}`}>
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1">
                  Approval Detail
                </p>
                <h3 className="text-sm font-bold text-gray-900 leading-snug">{selected.name}</h3>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[selected.status]}`}>
                {statusLabel[selected.status] ?? selected.status}
              </span>
            </div>

            {/* Info grid */}
            <div className="space-y-2 text-xs">
              {[
                { label: 'Owner',     value: selected.owner },
                { label: 'Email',     value: selected.email },
                { label: 'Phone',     value: selected.phone ?? '—' },
                { label: 'City',      value: selected.city ?? '—' },
                { label: 'Address',   value: selected.address ?? '—' },
                { label: 'Plan',      value: selected.plan ?? '—' },
                { label: 'Submitted', value: selected.created_at ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between py-1.5 border-b border-gray-50 gap-2">
                  <span className="text-gray-400 shrink-0">{label}</span>
                  <span className="font-semibold text-gray-800 truncate max-w-[140px] text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Documents</p>
              <div className="space-y-2">
                {[
                  { label: 'Trade License', file: selected.trade_license },
                  { label: 'Tax Document',  file: selected.tax_document },
                ].map(({ label, file }) => (
                  <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700">{label}</p>
                      {file
                        ? <a href={file} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">View document</a>
                        : <p className="text-[10px] text-gray-400">Not uploaded</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleApprove(selected.id)}
                disabled={selected.status === 'active' || actionId === selected.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {actionId === selected.id ? 'Approving...' : 'Approve Clinic'}
              </button>
              <button
                onClick={() => { setRejectId(selected.id); setReason(''); }}
                disabled={selected.status === 'rejected' || actionId === selected.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">Select a clinic to review</p>
            <p className="text-xs text-gray-300 mt-1">Click any row to open the approval panel.</p>
          </div>
        )}
      </div>
    </div>
  );
}