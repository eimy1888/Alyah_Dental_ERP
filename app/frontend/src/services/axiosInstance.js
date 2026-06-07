// import axios from 'axios';

// const apiClient = axios.create({
//   baseURL: '/api/v1',
//   headers: {
//     'Content-Type': 'application/json',
//     'Accept':       'application/json',
//   },
//   withCredentials: false,
// });

// apiClient.interceptors.request.use(
//   (config) => {
//     try {
//       const raw   = localStorage.getItem('dentflow-auth');
//       const store = raw ? JSON.parse(raw) : null;
//       const token = store?.state?.token;
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     } catch {
//       // ignore
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error.response?.status;
//     if (status === 401) {
//       try {
//         localStorage.removeItem('dentflow-auth');
//       } catch {
//         // ignore
//       }
//       if (window.location.pathname !== '/login') {
//         window.location.href = '/login';
//       }
//     }
//     if (status === 403) {
//       console.warn('Access denied — insufficient role.');
//     }
//     if (status === 500) {
//       console.error('Server error:', error.response?.data?.message ?? 'Unknown error');
//     }
//     return Promise.reject(error);
//   }
// );

// export default apiClient;
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
      const store = useAuthStore.getState();
      const isAuthenticated = !!store.user;
      const isLoggingOut    = store.isLoggingOut;

      // Never interfere with auth endpoints or during logout
      const isAuthEndpoint = url?.includes('/auth/');

      if (isAuthenticated && !isAuthEndpoint && !isLoggingOut) {
        useAuthStore.getState().clearAuth();

        const isPublicPage =
          window.location.pathname === '/login' ||
          window.location.pathname === '/' ||
          window.location.pathname.startsWith('/clinic/');

        if (!isPublicPage) {
          window.location.href = '/login';
        }
      }
    }

    if (status === 403 && !url?.includes('/notifications')) {
      console.warn('Access denied — insufficient role.');
    }


    if (status === 401) {
  const store = useAuthStore.getState();
  console.log('401 INTERCEPTOR FIRED:', {
    url,
    isAuthenticated: !!store.user,
    isLoggingOut: store.isLoggingOut,
    pathname: window.location.pathname,
  });
}

    if (status === 500) {
      console.error('Server error:', error.response?.data?.message ?? 'Unknown error');
    }

    return Promise.reject(error);
  }
);

export default apiClient;