// src/features/landing/hooks/useRegistration.js
import { useMutation, useQuery } from '@tanstack/react-query'
import { registerClinic, mockPayment, getPaymentStatus } from '../api/registrationApi'

export const useRegisterClinic = () =>
  useMutation({ mutationFn: registerClinic })

export const useMockPayment = () =>
  useMutation({ mutationFn: mockPayment })

export const usePaymentStatus = (clinicId) =>
  useQuery({
    queryKey: ['payment-status', clinicId],
    queryFn: () => getPaymentStatus(clinicId),
    enabled: !!clinicId,
    refetchInterval: 5000, // poll every 5s after payment
  })