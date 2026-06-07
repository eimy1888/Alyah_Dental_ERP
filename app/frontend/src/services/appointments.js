// // src/services/appointments.js

// import axiosInstance from './axiosInstance';

// export const getAppointments = async (params = {}) => {
//   const response = await axiosInstance.get('/appointments', { params });
//   return response.data;
// };

// export const getAppointment = async (id) => {
//   const response = await axiosInstance.get(`/appointments/${id}`);
//   return response.data;
// };

// export const createAppointment = async (data) => {
//   const response = await axiosInstance.post('/appointments', data);
//   return response.data;
// };

// export const updateAppointmentStatus = async (id, status) => {
//   const response = await axiosInstance.patch(`/appointments/${id}`, { status });
//   return response.data;
// };

// export const getDentists = async () => {
//   const response = await axiosInstance.get('/dentists');
//   return response.data;
// };