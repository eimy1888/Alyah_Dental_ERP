import apiClient from '../../../services/axiosInstance';

/**
 * Fetch public subscription plans from the backend.
 * Endpoint: GET /api/v1/plans  (no auth required)
 *
 * Backend returns: { success: true, data: [ ...plans ] }
 * Each plan: { id, name, slug, monthly_price, annual_price,
 *              max_users, max_branches, max_storage_gb, features: [...] }
 */
export const fetchPlans = async () => {
  const response = await apiClient.get('/plans');
  const payload  = response.data;

  // Backend shape: { success: true, data: [...] }
  if (payload?.success && Array.isArray(payload?.data)) {
    return { data: payload.data };
  }

  // Flat array fallback
  if (Array.isArray(payload)) {
    return { data: payload };
  }

  // Nested data key without success flag
  if (Array.isArray(payload?.data)) {
    return { data: payload.data };
  }

  return { data: [] };
};
