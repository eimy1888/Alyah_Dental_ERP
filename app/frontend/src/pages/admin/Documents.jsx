import { useEffect, useState } from 'react';
import { ArchiveRestore, Download, FileUp, FolderArchive, RefreshCw } from 'lucide-react';
import apiClient from '../../services/axiosInstance';

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'general', patient_id: '', file: null });
  const [message, setMessage] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/documents', {
        params: { include_archived: includeArchived ? 1 : 0 },
      });
      setDocuments(data?.data ?? []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, [includeArchived]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.file) return;
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('category', form.category);
    payload.append('file', form.file);
    if (form.patient_id) payload.append('patient_id', form.patient_id);

    try {
      await apiClient.post('/admin/documents', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ title: '', category: 'general', patient_id: '', file: null });
      setMessage('Document uploaded.');
      await loadDocuments();
    } catch {
      setMessage('Upload failed.');
    }
  };

  const archiveToggle = async (doc) => {
    await apiClient.post(`/admin/documents/${doc.id}/${doc.is_archived ? 'restore' : 'archive'}`);
    await loadDocuments();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">Clinic files, patient documents, and versioned uploads.</p>
        </div>
        <button onClick={loadDocuments} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_160px_120px_1fr_auto]">
        <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="general">General</option>
          <option value="clinical">Clinical</option>
          <option value="billing">Billing</option>
          <option value="insurance">Insurance</option>
          <option value="lab">Lab</option>
        </select>
        <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Patient ID" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} />
        <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} required />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <FileUp className="h-4 w-4" />
          Upload
        </button>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{message}</p>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          Include archived
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={5}>Loading documents...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={5}>No documents found.</td></tr>
            ) : documents.map((doc) => (
              <tr key={doc.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{doc.title}</div>
                  <div className="text-xs text-gray-500">{doc.original_name}</div>
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{doc.category}</td>
                <td className="px-4 py-3 text-gray-600">v{doc.version}</td>
                <td className="px-4 py-3 text-gray-600">{doc.created_at}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <a href={`/api/v1/admin/documents/${doc.id}/download`} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title="Download">
                      <Download className="h-4 w-4" />
                    </a>
                    <button onClick={() => archiveToggle(doc)} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title={doc.is_archived ? 'Restore' : 'Archive'}>
                      {doc.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <FolderArchive className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
