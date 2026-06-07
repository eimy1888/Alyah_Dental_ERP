import { useQuery } from '@tanstack/react-query';
import { fetchApprovedClinics } from '../api/showcaseApi';

export const useApprovedClinics = () =>
  useQuery({
    queryKey: ['approved-clinics'],
    queryFn: fetchApprovedClinics,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
