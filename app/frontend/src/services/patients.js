// // src/services/patients.js

// import axiosInstance from './axiosInstance';

// export const getPatients = async (params = {}) => {
//   const response = await axiosInstance.get('/patients', { params });
//   return response.data;
// };

// export const getPatient = async (id) => {
//   const response = await axiosInstance.get(`/patients/${id}`);
//   return response.data;
// };

// export const createPatient = async (data) => {
//   const response = await axiosInstance.post('/patients', data);
//   return response.data;
// };