import { useState, useEffect, useCallback  } from 'react';
import { 
  Search, Plus, X, Save, Edit2, Phone, Mail, MapPin,
  Calendar, Shield, AlertTriangle, FileText, History,
  Activity, Stethoscope, ChevronRight, User, Heart
} from 'lucide-react';
import { 
  getPatients, getPatient, addPatientNote, updatePatientInsurance 
} from '../../services/dentistService';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const TABS = ['Overview', 'Medical History', 'Appointments', 'Medical Records'];

export default function DentistPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', note_type: 'General' });
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({ provider: '', number: '' });
  const [toast, setToast] = useState(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPatients =async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, per_page: 10 };
      if (search) params.search = search;
      const response = await getPatients(params);
      setPatients(response.data || []);
      setPagination({
        current_page: response.meta?.current_page || 1,
        last_page: response.meta?.last_page || 1,
        total: response.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load patients:', error);
      showToast('Failed to load patients', 'error');
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  loadPatients();
}, [search]); 

  const handleSearch = () => {
    loadPatients(1);
  };

  const handleSelectPatient = async (patient) => {
    try {
      setSelectedPatient(patient);
      setActiveTab('Overview');
      
      // Load full patient details including medical records
      const fullPatient = await getPatient(patient.id);
      setSelectedPatient(fullPatient);
      
      // Load medical records for this patient
      setLoadingRecords(true);
      const response = await fetch(`/api/dentist/medical-records?patient_id=${patient.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await response.json();
      if (json.success) {
        setMedicalRecords(json.data.records || []);
      }
      setLoadingRecords(false);
    } catch (error) {
      console.error('Failed to load patient details:', error);
      showToast('Failed to load patient details', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      showToast('Please enter note content', 'error');
      return;
    }
    try {
      await addPatientNote(selectedPatient.id, newNote);
      showToast('Clinical note added successfully');
      setShowAddNoteModal(false);
      setNewNote({ content: '', note_type: 'General' });
      // Refresh patient details
      const refreshed = await getPatient(selectedPatient.id);
      setSelectedPatient(refreshed);
    } catch (error) {
      showToast('Failed to add note', error);
    }
  };

  const handleUpdateInsurance = async () => {
    try {
      await updatePatientInsurance(selectedPatient.id, {
        insurance_provider: insuranceForm.provider,
        insurance_number: insuranceForm.number
      });
      showToast('Insurance updated successfully');
      setEditingInsurance(false);
      const refreshed = await getPatient(selectedPatient.id);
      setSelectedPatient(refreshed);
    } catch (error) {
      showToast('Failed to update insurance', error);
    }
  };

  const startEditingInsurance = () => {
    setInsuranceForm({
      provider: selectedPatient?.insurance_provider || '',
      number: selectedPatient?.insurance_number || ''
    });
    setEditingInsurance(true);
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;
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

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add Clinical Note</h3>
              <button onClick={() => setShowAddNoteModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note Type</label>
                <select
                  value={newNote.note_type}
                  onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                >
                  <option value="General">General</option>
                  <option value="Treatment Plan">Treatment Plan</option>
                  <option value="Post-Op">Post-Op</option>
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="Referral">Referral</option>
                  <option value="Complaint">Complaint</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter clinical notes..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setShowAddNoteModal(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleAddNote} className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900">
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
          Dentist Workspace
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
        <p className="text-sm text-gray-500 mt-1">
          View assigned patients, medical history, and clinical notes.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, or insurance..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200">
          Search
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Patient List - Left Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Patient List</h2>
            <p className="text-xs text-gray-400">{pagination.total} patients</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {patients.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No patients found.
                  </div>
                ) : (
                  patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                        selectedPatient?.id === patient.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">
                        {getInitials(patient.first_name, patient.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${statusColors[patient.status]}`}>
                            {patient.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {patient.phone || 'No phone'} · {patient.age || '?'} yrs
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-gray-700">
                          {patient.outstanding_balance || '0'} ETB
                        </p>
                        <p className="text-[10px] text-gray-400">{patient.insurance_provider || 'No insurance'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-center gap-1 p-3 border-t border-gray-100">
                  {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => loadPatients(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                          pagination.current_page === page
                            ? 'bg-[#1F4E79] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Patient Profile - Right Column */}
        {selectedPatient ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            
            {/* Profile Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 text-2xl font-bold flex items-center justify-center">
                    {getInitials(selectedPatient.first_name, selectedPatient.last_name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono">
                        PAT-{String(selectedPatient.id).padStart(4, '0')}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{selectedPatient.age || '?'} yrs</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{selectedPatient.city || 'Addis Ababa'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddNoteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900"
                >
                  <Plus className="w-4 h-4" /> Add Note
                </button>
              </div>

              {/* Alerts */}
              {selectedPatient.medical_history?.allergies?.length > 0 && (
                <div className="mt-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">
                      Allergies: {selectedPatient.medical_history.allergies.join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Next Visit */}
              {selectedPatient.next_visit && (
                <div className="mt-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">
                      Next visit: {selectedPatient.next_visit}
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-2 mt-6 flex-wrap">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeTab === tab
                        ? 'bg-[#1F4E79] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              
              {/* Overview Tab */}
              {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Demographics</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Email', value: selectedPatient.email || '—', icon: Mail },
                        { label: 'Phone', value: selectedPatient.phone || '—', icon: Phone },
                        { label: 'City', value: selectedPatient.city || '—', icon: MapPin },
                        { label: 'Date of Birth', value: selectedPatient.date_of_birth || '—', icon: Calendar },
                        { label: 'Gender', value: selectedPatient.gender || '—', icon: User },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-50">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500 w-28">{label}</span>
                          <span className="text-sm font-medium text-gray-800 flex-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900">Insurance</h3>
                      {!editingInsurance && (
                        <button onClick={startEditingInsurance} className="text-xs text-blue-600 flex items-center gap-1">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </div>
                    
                    {editingInsurance ? (
                      <div className="space-y-3">
                        <input
                          value={insuranceForm.provider}
                          onChange={(e) => setInsuranceForm({ ...insuranceForm, provider: e.target.value })}
                          placeholder="Insurance Provider"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm"
                        />
                        <input
                          value={insuranceForm.number}
                          onChange={(e) => setInsuranceForm({ ...insuranceForm, number: e.target.value })}
                          placeholder="Insurance Number"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleUpdateInsurance} className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold">
                            Save
                          </button>
                          <button onClick={() => setEditingInsurance(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: 'Provider', value: selectedPatient.insurance_provider || '—' },
                          { label: 'Number', value: selectedPatient.insurance_number || '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center py-2 border-b border-gray-50">
                            <span className="text-sm text-gray-500 w-24">{label}</span>
                            <span className="text-sm font-medium text-gray-800 flex-1">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'Medical History' && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Medical History</h3>
                  {selectedPatient.medical_history ? (
                    <div className="space-y-4">
                      {selectedPatient.medical_history.allergies?.length > 0 && (
                        <div className="p-4 rounded-xl bg-gray-50">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Allergies</p>
                          <div className="flex gap-2 flex-wrap">
                            {selectedPatient.medical_history.allergies.map((a, i) => (
                              <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedPatient.medical_history.chronic_conditions?.length > 0 && (
                        <div className="p-4 rounded-xl bg-gray-50">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Chronic Conditions</p>
                          <div className="flex gap-2 flex-wrap">
                            {selectedPatient.medical_history.chronic_conditions.map((c, i) => (
                              <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedPatient.medical_history.past_surgeries?.length > 0 && (
                        <div className="p-4 rounded-xl bg-gray-50">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Past Surgeries</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {selectedPatient.medical_history.past_surgeries.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedPatient.medical_history.blood_type && (
                        <div className="p-4 rounded-xl bg-gray-50">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Blood Type</p>
                          <p className="text-sm font-bold text-gray-800">{selectedPatient.medical_history.blood_type}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No medical history recorded.</p>
                  )}
                </div>
              )}

              {/* Appointments Tab */}
              {activeTab === 'Appointments' && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Appointment History</h3>
                  {selectedPatient.appointments?.length === 0 ? (
                    <p className="text-sm text-gray-400">No appointments found.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedPatient.appointments?.map((appt) => (
                        <div key={appt.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{appt.type}</p>
                            <p className="text-xs text-gray-500">{appt.date} at {appt.time}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700`}>
                            {appt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Medical Records Tab */}
              {activeTab === 'Medical Records' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Medical Records Timeline</h3>
                    <button className="text-xs text-blue-600 flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {loadingRecords ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : medicalRecords.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No medical records found.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {medicalRecords.map((record, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            {record.type === 'prescription' && <FileText className="w-4 h-4" />}
                            {record.type === 'xray' && <Activity className="w-4 h-4" />}
                            {record.type === 'clinical_note' && <History className="w-4 h-4" />}
                            {record.type === 'appointment' && <Calendar className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="text-sm font-semibold text-gray-900">{record.description}</p>
                              <span className="text-xs text-gray-400">{record.date}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {record.type === 'prescription' && record.details?.medication}
                              {record.type === 'clinical_note' && record.details?.content_snippet}
                              {record.type === 'xray' && `${record.details?.study_type} - ${record.details?.status}`}
                              {record.type === 'appointment' && `${record.details?.status}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center">
            <User className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-base font-medium text-gray-500">Select a patient</p>
            <p className="text-sm text-gray-400 mt-1">Click any patient from the list to view their profile.</p>
          </div>
        )}
      </div>
    </div>
  );
}