import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import { getBranches, getClinicProfile } from '../../services/publicService';

const dayNames = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

export default function LocationsPage() {
  const { slug } = useParams();
  const [branches, setBranches] = useState([]);
  const [clinicProfile, setClinicProfile] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      try {
        const [branchesData, profile] = await Promise.all([
          getBranches(slug),
          getClinicProfile(slug),
        ]);
        setBranches(branchesData);
        setClinicProfile(profile);
        if (branchesData.length > 0) {
          setSelectedBranch(branchesData[0]);
        }
      } catch (error) {
        console.error('Failed to load locations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Locations</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Visit us at any of our convenient locations across Addis Ababa for quality dental care.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Branch List */}
          <div className="space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                onClick={() => setSelectedBranch(branch)}
                className={`p-5 rounded-2xl border cursor-pointer transition ${
                  selectedBranch?.id === branch.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-100 bg-white hover:shadow-md'
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{branch.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-gray-500">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{branch.location}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone className="w-4 h-4 shrink-0" />
                      <a href={`tel:${branch.phone}`} className="hover:text-blue-600">{branch.phone}</a>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Mail className="w-4 h-4 shrink-0" />
                      <a href={`mailto:${branch.email}`} className="hover:text-blue-600">{branch.email}</a>
                    </div>
                  )}
                </div>
                {branch.map_link && (
                  <a
                    href={branch.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Get Directions <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Branch Details & Map */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {selectedBranch && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedBranch.name}</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Address</p>
                      <p className="text-gray-500 text-sm">{selectedBranch.location}</p>
                    </div>
                  </div>
                  
                  {selectedBranch.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Phone</p>
                        <a href={`tel:${selectedBranch.phone}`} className="text-gray-500 text-sm hover:text-blue-600">
                          {selectedBranch.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Working Hours</p>
                      <div className="space-y-1 mt-1">
                        {selectedBranch.working_hours && Object.entries(selectedBranch.working_hours).map(([day, hours]) => (
                          hours && (
                            <div key={day} className="flex justify-between text-sm">
                              <span className="text-gray-500">{dayNames[day]}</span>
                              <span className="text-gray-700">{hours}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBranch.map_link && (
                  <div className="mt-4">
                    <iframe
                      src={selectedBranch.map_link}
                      title={`${selectedBranch.name} map`}
                      className="w-full h-64 rounded-xl border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}