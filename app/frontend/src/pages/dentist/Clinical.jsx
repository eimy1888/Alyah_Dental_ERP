import { useEffect, useMemo, useState } from 'react';
import { FileText, Image, NotebookPen, Printer, CheckCircle2, Upload, Search } from 'lucide-react';
import {
  createClinicalNote,
  createPrescription,
  finalizePrescription,
  getPatientClinicalNotes,
  getPatientPrescriptions,
  getPatientXrays,
  getPatients,
  printPrescription,
  signClinicalNote,
  uploadXray,
} from '../../services/dentistService';

const emptyPrescription = {
  drug_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
};

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
      {toast.message}
    </div>
  );
}

export default function DentistClinical() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState({ prescriptions: [], xrays: [], notes: [] });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prescription, setPrescription] = useState({ notes: '', item: emptyPrescription });
  const [draftPrescriptionId, setDraftPrescriptionId] = useState(null);
  const [note, setNote] = useState({ title: '', note: '' });
  const [draftNoteId, setDraftNoteId] = useState(null);
  const [xray, setXray] = useState({ description: '', file: null });

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === String(patientId)),
    [patients, patientId]
  );

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadPatients = async () => {
    const result = await getPatients({ search, per_page: 30 });
    const list = result.data || result || [];
    setPatients(Array.isArray(list) ? list : []);
  };

  const loadHistory = async (id = patientId) => {
    if (!id) return;
    const [prescriptions, xrays, notes] = await Promise.all([
      getPatientPrescriptions(id),
      getPatientXrays(id),
      getPatientClinicalNotes(id),
    ]);
    setHistory({ prescriptions, xrays, notes });
  };

  useEffect(() => {
    loadPatients().catch(() => showToast('Could not load patients', 'error'));
  }, []);

  useEffect(() => {
    loadHistory().catch(() => showToast('Could not load patient history', 'error'));
  }, [patientId]);

  const handleCreatePrescription = async () => {
    if (!patientId) return showToast('Select a patient first', 'error');
    setLoading(true);
    try {
      const response = await createPrescription({
        patient_id: Number(patientId),
        notes: prescription.notes,
        items: [prescription.item],
      });
      setDraftPrescriptionId(response.data.id);
      showToast('Prescription draft created');
      await loadHistory();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not create prescription', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizePrescription = async () => {
    if (!draftPrescriptionId) return showToast('Create a prescription draft first', 'error');
    await finalizePrescription(draftPrescriptionId);
    setDraftPrescriptionId(null);
    setPrescription({ notes: '', item: emptyPrescription });
    showToast('Prescription finalized');
    await loadHistory();
  };

  const handlePrintPrescription = async (id) => {
    const printable = await printPrescription(id);
    const lines = printable.prescription.items.map((item) => `${item.drug_name} ${item.dosage || ''} ${item.frequency || ''} ${item.duration || ''}`).join('\n');
    const popup = window.open('', '_blank', 'width=720,height=800');
    popup.document.write(`<pre style="font:14px Arial;white-space:pre-wrap">${lines}</pre>`);
    popup.document.close();
    popup.print();
  };

  const handleUploadXray = async () => {
    if (!patientId || !xray.file) return showToast('Select a patient and image', 'error');
    const form = new FormData();
    form.append('patient_id', patientId);
    form.append('description', xray.description);
    form.append('file', xray.file);
    await uploadXray(form);
    setXray({ description: '', file: null });
    showToast('X-ray uploaded');
    await loadHistory();
  };

  const handleCreateNote = async () => {
    if (!patientId) return showToast('Select a patient first', 'error');
    const response = await createClinicalNote({ patient_id: Number(patientId), ...note });
    setDraftNoteId(response.data.id);
    showToast('Clinical note draft created');
    await loadHistory();
  };

  const handleSignNote = async () => {
    if (!draftNoteId) return showToast('Create a clinical note draft first', 'error');
    await signClinicalNote(draftNoteId);
    setDraftNoteId(null);
    setNote({ title: '', note: '' });
    showToast('Clinical note signed');
    await loadHistory();
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clinical Workspace</h1>
          <p className="text-sm text-gray-500">Prescriptions, x-rays, notes, and patient clinical history.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className="h-9 w-56 rounded-lg border border-gray-200 pl-9 pr-3 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients" />
          </div>
          <button className="rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white" onClick={loadPatients}>Search</button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Patient</label>
        <select className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Select patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.full_name || `${patient.first_name} ${patient.last_name}`}</option>
          ))}
        </select>
        {selectedPatient && <p className="mt-2 text-xs text-gray-500">{selectedPatient.phone || selectedPatient.email || 'Patient selected'}</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FileText className="h-4 w-4" /> Prescription</div>
          <div className="space-y-3">
            {['drug_name', 'dosage', 'frequency', 'duration'].map((field) => (
              <input key={field} className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm" placeholder={field.replace('_', ' ')} value={prescription.item[field]} onChange={(e) => setPrescription((p) => ({ ...p, item: { ...p.item, [field]: e.target.value } }))} />
            ))}
            <textarea className="min-h-20 w-full rounded-lg border border-gray-200 p-3 text-sm" placeholder="Instructions" value={prescription.item.instructions} onChange={(e) => setPrescription((p) => ({ ...p, item: { ...p.item, instructions: e.target.value } }))} />
            <textarea className="min-h-16 w-full rounded-lg border border-gray-200 p-3 text-sm" placeholder="Prescription notes" value={prescription.notes} onChange={(e) => setPrescription((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <button disabled={loading} onClick={handleCreatePrescription} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Save Draft</button>
              <button onClick={handleFinalizePrescription} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">Finalize</button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><Image className="h-4 w-4" /> X-Ray</div>
          <div className="space-y-3">
            <input className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm" placeholder="Description" value={xray.description} onChange={(e) => setXray((x) => ({ ...x, description: e.target.value }))} />
            <input type="file" accept="image/*" className="w-full rounded-lg border border-gray-200 p-2 text-sm" onChange={(e) => setXray((x) => ({ ...x, file: e.target.files?.[0] || null }))} />
            <button onClick={handleUploadXray} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white"><Upload className="h-4 w-4" /> Upload</button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><NotebookPen className="h-4 w-4" /> Clinical Note</div>
          <div className="space-y-3">
            <input className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm" placeholder="Title" value={note.title} onChange={(e) => setNote((n) => ({ ...n, title: e.target.value }))} />
            <textarea className="min-h-32 w-full rounded-lg border border-gray-200 p-3 text-sm" placeholder="Note" value={note.note} onChange={(e) => setNote((n) => ({ ...n, note: e.target.value }))} />
            <div className="flex gap-2">
              <button onClick={handleCreateNote} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Save Draft</button>
              <button onClick={handleSignNote} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" /> Sign</button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HistoryPanel title="Prescriptions" items={history.prescriptions} empty="No prescriptions">
          {(item) => (
            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div>
                <p className="text-sm font-semibold">{item.items?.[0]?.drug_name || 'Prescription'}</p>
                <p className="text-xs text-gray-500">{item.date} · {item.status}</p>
              </div>
              <button onClick={() => handlePrintPrescription(item.id)} className="rounded-lg border border-gray-200 p-2"><Printer className="h-4 w-4" /></button>
            </div>
          )}
        </HistoryPanel>
        <HistoryPanel title="X-Rays" items={history.xrays} empty="No x-rays">
          {(item) => (
            <a className="block rounded-lg border border-gray-100 p-3" href={item.file_url} target="_blank" rel="noreferrer">
              <p className="text-sm font-semibold">{item.study_type}</p>
              <p className="text-xs text-gray-500">{item.description || item.status}</p>
            </a>
          )}
        </HistoryPanel>
        <HistoryPanel title="Clinical Notes" items={history.notes} empty="No notes">
          {(item) => (
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.note}</p>
            </div>
          )}
        </HistoryPanel>
      </div>
    </div>
  );
}

function HistoryPanel({ title, items, empty, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-gray-900">{title}</h2>
      <div className="space-y-2">
        {items?.length ? items.map((item) => <div key={item.id}>{children(item)}</div>) : <p className="text-sm text-gray-500">{empty}</p>}
      </div>
    </section>
  );
}
