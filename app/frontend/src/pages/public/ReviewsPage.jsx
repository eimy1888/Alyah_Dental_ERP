import { useState, useEffect } from 'react';
import { Star, Filter } from 'lucide-react';
import { getTestimonials } from '../../services/publicService';

export default function ReviewsPage() {
  const [testimonials, setTestimonials] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const params = ratingFilter !== 'all' ? { rating: ratingFilter } : {};
        const data = await getTestimonials(params);
        setTestimonials(data.testimonials || []);
        setAverageRating(data.average_rating || 0);
        setTotalReviews(data.total_reviews || 0);
      } catch (error) {
        console.error('Failed to load testimonials:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTestimonials();
  }, [ratingFilter]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Patient Stories</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Read what our patients have to say about their experience with us.
          </p>
        </div>

        {/* Rating Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            <span className="text-4xl font-bold text-gray-900">{averageRating}</span>
            <span className="text-gray-400">/ 5</span>
          </div>
          <p className="text-gray-500">Based on {totalReviews} reviews</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setRatingFilter(rating)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                ratingFilter === rating
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {rating === 'all' ? 'All Reviews' : `${rating} Stars`}
            </button>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-gray-600 text-sm mb-4">"{testimonial.comment}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="font-bold text-blue-600">{testimonial.patient_name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{testimonial.patient_name}</p>
                  <p className="text-xs text-gray-400">{testimonial.treatment} · {testimonial.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {testimonials.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No reviews found for this rating.
          </div>
        )}
      </div>
    </div>
  );
}