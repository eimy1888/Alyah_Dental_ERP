// src/features/landing/api/registrationApi.js
import apiClient from '../../../services/axiosInstance'

export const registerClinic = (data) =>
  apiClient.post('/register-clinic', data).then(res => res.data)

export const mockPayment = (data) =>
  apiClient.post('/mock-payment', data).then(res => res.data)

export const getPaymentStatus = (clinicId) =>
  apiClient.get(`/payment-status/${clinicId}`).then(res => res.data)