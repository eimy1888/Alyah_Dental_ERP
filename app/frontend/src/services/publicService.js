import axios from 'axios';
import api from './axiosInstance';

// ── Public client — no auth interceptor, no redirect on 401 ──────────────────
const publicApi = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  withCredentials: false, // public endpoints don't need cookies
});

export const getClinicProfile = (slug) =>
  publicApi.get(`/public/clinic/${slug}/profile`).then((res) => res.data.data);

export const getServices = (slug) =>
  publicApi.get(`/public/clinic/${slug}/services`).then((res) => res.data.data);

export const getStaff = (slug) =>
  publicApi.get(`/public/clinic/${slug}/staff`).then((res) => res.data.data);

export const getBranches = (slug) =>
  publicApi.get(`/public/clinic/${slug}/branches`).then((res) => res.data.data);

export const getTestimonials = (slug, params = {}) =>
  publicApi.get(`/public/clinic/${slug}/testimonials`, { params }).then((res) => res.data.data);

export const submitContact = (slug, data) =>
  publicApi.post(`/public/clinic/${slug}/contact`, data).then((res) => res.data);