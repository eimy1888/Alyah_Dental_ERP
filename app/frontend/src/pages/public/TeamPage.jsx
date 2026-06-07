import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';
import { getStaff } from '../../services/publicService';

export default function TeamPage() {
  const { slug } = useParams();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    const loadStaff = async () => {
      if (!slug) return;
      try {
        const data = await getStaff(slug);
        setStaff(data);
      } catch (error) {
        console.error('Failed to load staff:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStaff();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Experts</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our experienced team of dental professionals combines world-class expertise with genuine care for every patient.
          </p>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {staff.map((member) => (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="bg-white rounded-2xl border border-gray-100 p-6 text-center cursor-pointer hover:shadow-md transition group"
            >
              <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden bg-gray-200">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600">
                    {member.name?.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm text-blue-600">{member.role}</p>
              <p className="text-xs text-gray-400 mt-1">{member.specialization}</p>
              <div className="mt-3 opacity-0 group-hover:opacity-100 transition">
                <span className="text-xs text-blue-600">Click to view bio</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Bio */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMember(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                  {selectedMember.photo_url ? (
                    <img src={selectedMember.photo_url} alt={selectedMember.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                      {selectedMember.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedMember.name}</h3>
                  <p className="text-blue-600">{selectedMember.role}</p>
                  <p className="text-sm text-gray-500">{selectedMember.specialization}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-gray-600 text-sm mb-3">{selectedMember.bio || 'No bio available.'}</p>
                {selectedMember.specialties && selectedMember.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedMember.specialties.map((spec, idx) => (
                      <span key={idx} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  {selectedMember.phone && (
                    <a href={`tel:${selectedMember.phone}`} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedMember.phone}
                    </a>
                  )}
                  {selectedMember.email && (
                    <a href={`mailto:${selectedMember.email}`} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="mt-4 w-full py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}