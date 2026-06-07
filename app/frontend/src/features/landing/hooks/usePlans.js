import { useQuery } from '@tanstack/react-query';
import { fetchPlans } from '../api/planApi';

/**
 * usePlans — fetches public subscription plans from /api/v1/plans.
 * Plans are managed by the Platform Admin and served without authentication.
 */
export const usePlans = () =>
  useQuery({
    queryKey:  ['public-plans'],
    queryFn:   fetchPlans,
    staleTime: 5 * 60 * 1000,   // re-fetch after 5 min
    gcTime:    10 * 60 * 1000,  // keep in cache 10 min
    retry:     2,               // retry twice on failure
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
