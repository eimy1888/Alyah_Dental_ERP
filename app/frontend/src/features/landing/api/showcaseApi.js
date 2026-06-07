import axios from 'axios';

const publicApi = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: false,
});

/** GET /api/v1/public/approved-clinics — list of approved clinics for showcase */
export const fetchApprovedClinics = async () => {
  const res = await publicApi.get('/public/approved-clinics');
  const payload = res.data;
  if (payload?.success && Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};
