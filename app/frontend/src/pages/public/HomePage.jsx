import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Calendar, Clock, Award, Users, Smile, 
  Shield, Activity, ChevronRight, Star, MapPin, Phone, Mail, Heart
} from 'lucide-react';
import { 
  getClinicProfile, getServices, getStaff, 
  getTestimonials, getBranches 
} from '../../services/publicService';

export default function HomePage() {
  const { slug } = useParams();
  const [clinicProfile, setClinicProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      try {
        const [profile, servicesData, staffData, testimonialsData, branchesData] = await Promise.all([
          getClinicProfile(slug),
          getServices(slug),
          getStaff(slug),
          getTestimonials(slug),
          getBranches(slug),
        ]);
        setClinicProfile(profile);
        setServices(servicesData.slice(0, 3));
        setStaff(staffData.slice(0, 4));
        setTestimonials(testimonialsData.testimonials?.slice(0, 3) || []);
        setStats(profile.stats || {});
      } catch (error) {
        console.error('Failed to load homepage data:', error);
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
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {clinicProfile?.hero_title || 'Your healthy smile starts here'}
              </h1>
              <p className="text-lg text-blue-100 mb-8">
                {clinicProfile?.hero_subtitle || 'Experience world-class dental care with Ethiopia\'s most trusted professionals.'}
              </p>
              <div className="flex flex-wrap gap-4">
                {/* CHANGED: Book Appointment now redirects to LOGIN page instead of REGISTER */}
                <Link
                  to={`/clinic/${slug}/login`}
                  className="px-6 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg"
                >
                  Book Appointment
                </Link>
                <Link
                  to={`/clinic/${slug}/contact`}
                  className="px-6 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition"
                >
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-4">
                  <Calendar className="w-8 h-8" />
                  <div>
                    <p className="font-semibold">Next Available</p>
                    <p className="text-2xl font-bold">Today, 2:30 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Award className="w-8 h-8" />
                  <div>
                    <p className="font-semibold">Patient Satisfaction</p>
                    <p className="text-2xl font-bold">{stats.satisfaction_rate || 98}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.monthly_patients || 800}+</p>
              <p className="text-sm text-gray-500">Monthly Patients</p>
            </div>
            <div>
              <Smile className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.satisfaction_rate || 98}%</p>
              <p className="text-sm text-gray-500">Satisfaction Rate</p>
            </div>
            <div>
              <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.years_experience || 15}+</p>
              <p className="text-sm text-gray-500">Years Experience</p>
            </div>
            <div>
              <Heart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.happy_patients || 15000}+</p>
              <p className="text-sm text-gray-500">Happy Patients</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive dental care for your whole family. From routine checkups to advanced procedures.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{service.description || 'Comprehensive dental care tailored to your needs.'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{service.duration_minutes} min</span>
                  <span className="text-lg font-bold text-blue-600">ETB {service.price.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={`/clinic/${slug}/services`} className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-1">
              View All Services <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Team Preview */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Experts</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our experienced team combines world-class expertise with genuine care for every patient.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {staff.map((member) => (
              <div key={member.id} className="text-center group cursor-pointer">
                <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden bg-gray-200">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                      {member.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-blue-600">{member.role}</p>
                <p className="text-xs text-gray-400 mt-1">{member.specialization}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={`/clinic/${slug}/team`} className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-1">
              Meet the Full Team <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Patients Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real stories from real patients who trust us with their smiles.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4">"{testimonial.comment}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="font-bold text-blue-600">{testimonial.patient_name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.patient_name}</p>
                    <p className="text-xs text-gray-400">{testimonial.treatment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={`/clinic/${slug}/reviews`} className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-1">
              Read More Reviews <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your smile?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Book your appointment today and take the first step towards a healthier, more confident smile.
          </p>
          {/* CHANGED: Book Appointment button now redirects to LOGIN page instead of REGISTER */}
          <Link
            to={`/clinic/${slug}/login`}
            className="px-8 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition inline-flex items-center gap-2 shadow-lg"
          >
            Book Your Appointment <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}