import axios from 'axios';
import useAuthStore from '../store/authStore';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url    = error.config?.url;

    if (status === 401) {
      const store           = useAuthStore.getState();
      const isAuthenticated = !!store.user;
      const isLoggingOut    = store.isLoggingOut;
      const isAuthEndpoint  = url?.includes('/auth/');

      if (isAuthenticated && !isAuthEndpoint && !isLoggingOut) {
        useAuthStore.getState().clearAuth();

        const isPublicPage =
          window.location.pathname === '/login' ||
          window.location.pathname === '/'      ||
          window.location.pathname.startsWith('/clinic/');

        if (!isPublicPage) {
          window.location.href = '/login';
        }
      }
    }

    if (status === 403 && !url?.includes('/notifications')) {
      console.warn('Access denied — insufficient role.');
    }

    if (status === 500) {
      console.error('Server error:', error.response?.data?.message ?? 'Unknown error');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
