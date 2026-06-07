// src/services/payments.js

import axiosInstance from './axiosInstance';

export const getPayments = async (params = {}) => {
  const response = await axiosInstance.get('/payments', { params });
  return response.data;
};

export const recordPayment = async (data) => {
  const response = await axiosInstance.post('/payments', data);
  return response.data;
};