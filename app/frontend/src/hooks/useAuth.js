// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import apiClient from '../services/axiosInstance';
// import useAuthStore from '../store/authStore';

// export const useAuth = () => {
//   const navigate        = useNavigate();
//   const { setAuth, logout: storeLogout, user } = useAuthStore();

//   const [isLoggingIn, setIsLoggingIn] = useState(false);
//   const [loginError,  setLoginError]  = useState('');

//   const login = async ({ email, password }) => {
//     setIsLoggingIn(true);
//     setLoginError('');

//     try {
//       const res  = await apiClient.post('/auth/login', { email, password });
//       const json = res.data;

//       if (!json.success) {
//         setLoginError(json.message || 'Invalid credentials.');
//         return;
//       }

//       const { user, token, clinic, branch } = json.data;
      
//       // Store user with complete clinic object (including slug)
//       setAuth(user, token, clinic, branch);

//       // Role-based redirect
//       const role = user.role;

//       if (role === 'platform_admin')  return navigate('/platform/dashboard');
//       if (role === 'clinic_admin')    return navigate('/admin/dashboard');
//       if (role === 'branch_manager')  return navigate('/manager/dashboard');
//       if (role === 'accountant')      return navigate('/accountant/dashboard');
//       if (role === 'receptionist')    return navigate('/receptionist/dashboard');
//       if (role === 'dentist')         return navigate('/dentist/dashboard');
//       if (role === 'patient')         return navigate('/patient/dashboard');

//       // Fallback
//       navigate('/login');

//     } catch (err) {
//       const message = err.response?.data?.message || 'Login failed. Please try again.';
//       setLoginError(message);
//     } finally {
//       setIsLoggingIn(false);
//     }
//   };

//   const logout = () => {
//     // Get clinic slug BEFORE clearing the store
//     const clinicSlug = user?.clinic?.slug;
//     console.log(clinicSlug);
//     // Clear the store
//     storeLogout();
    
//     // Redirect to the appropriate login page
//     if (clinicSlug) {
//       // Clinic staff/patient → redirect to clinic login page
//       navigate(`/clinic/${clinicSlug}/login`, { replace: true });
//     } else {
//       // Platform admin or fallback → redirect to main login
//       navigate('/login', { replace: true });
//     }
//   };

//   return { login, logout, isLoggingIn, loginError };
// };


// import { useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import apiClient from '../services/axiosInstance';
// import useAuthStore from '../store/authStore';

// const ROLE_REDIRECTS = {
//   platform_admin: '/platform/dashboard',
//   clinic_admin:   '/admin/dashboard',
//   branch_manager: '/manager/dashboard',
//   accountant:     '/accountant/dashboard',
//   receptionist:   '/receptionist/dashboard',
//   dentist:        '/dentist/dashboard',
//   patient:        '/patient/dashboard',
// };

// export const useAuth = () => {
//   const navigate  = useNavigate();
//   const setAuth   = useAuthStore((s) => s.setAuth);
//   const clearAuth = useAuthStore((s) => s.clearAuth);
//   const setLoggingOut = useAuthStore((s) => s.setLoggingOut);

//   const [isLoggingIn, setIsLoggingIn] = useState(false);
//   const [loginError,  setLoginError]  = useState('');

//   const login = useCallback(
//     async (credentials, { requireRole } = {}) => {
//       setIsLoggingIn(true);
//       setLoginError('');

//       try {
//         const { data } = await apiClient.post('/auth/login', credentials);

//         if (!data.success) {
//           setLoginError(data.message || 'Invalid credentials.');
//           return false;
//         }

//         const { user: userData, clinic, branch } = data.data;

//         if (requireRole && userData.role !== requireRole) {
//           setLoginError(
//             'Access Denied: This login page is only for Platform Administrators.'
//           );
//           return false;
//         }

//         clearAuth();
//         setAuth(userData, clinic, branch);

//         const redirectPath = ROLE_REDIRECTS[userData.role] || '/login';
//         navigate(redirectPath, { replace: true });
//         return true;
//       } catch (err) {
//         const message =
//           err.response?.data?.message || 'Login failed. Please try again.';
//         setLoginError(message);
//         return false;
//       } finally {
//         setIsLoggingIn(false);
//       }
//     },
//     [navigate, setAuth, clearAuth]
//   );

//   const logout = useCallback(async () => {
//   const clinicSlug = useAuthStore.getState().getClinicSlug();
//   const target = clinicSlug ? `/clinic/${clinicSlug}/login` : '/login';
  
//   console.log('LOGOUT START - target:', target);
//   setLoggingOut(true);
//   console.log('isLoggingOut set to true');
  
//   navigate(target, { replace: true });
//   console.log('navigate called');
  
//   clearAuth();
//   console.log('clearAuth called');
  
//   apiClient.post('/auth/logout').catch(() => {});
// }, [navigate, clearAuth, setLoggingOut]);

//   return { login, logout, isLoggingIn, loginError };
// };


import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/axiosInstance';
import useAuthStore from '../store/authStore';

const ROLE_REDIRECTS = {
  platform_admin: '/platform/dashboard',
  clinic_admin:   '/admin/dashboard',
  branch_manager: '/manager/dashboard',
  accountant:     '/accountant/dashboard',
  receptionist:   '/receptionist/dashboard',
  dentist:        '/dentist/dashboard',
  patient:        '/patient/dashboard',
  lab_technician: '/lab/dashboard',
};

export const useAuth = () => {
  const navigate      = useNavigate();
  const setAuth       = useAuthStore((s) => s.setAuth);
  const clearAuth     = useAuthStore((s) => s.clearAuth);
  const setLoggingOut = useAuthStore((s) => s.setLoggingOut);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError,  setLoginError]  = useState('');

  const login = useCallback(
    async (credentials, { requireRole } = {}) => {
      setIsLoggingIn(true);
      setLoginError('');

      try {
        const { data } = await apiClient.post('/auth/login', credentials);

        if (!data.success) {
          setLoginError(data.message || 'Invalid credentials.');
          return false;
        }

        const { user: userData, clinic, branch } = data.data;

        if (requireRole && userData.role !== requireRole) {
          setLoginError(
            'Access Denied: This login page is only for Platform Administrators.'
          );
          return false;
        }

        // ── FIX: setAuth BEFORE navigate, never clearAuth during login ──
        // clearAuth() was causing a race: user → null → re-render → wrong redirect
        setAuth(userData, clinic, branch);

        const redirectPath = userData.must_change_password
          ? '/change-password'
          : ROLE_REDIRECTS[userData.role] || '/login';
        navigate(redirectPath, { replace: true });
        return true;
      } catch (err) {
        const message =
          err?.response?.data?.message || 'Login failed. Please try again.';
        setLoginError(message);
        return false;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [navigate, setAuth]
  );

  const logout = useCallback(async () => {
    const clinicSlug = useAuthStore.getState().getClinicSlug();
    const target     = clinicSlug ? `/clinic/${clinicSlug}/login` : '/login';

    setLoggingOut(true);
    navigate(target, { replace: true });
    clearAuth();
    apiClient.post('/auth/logout').catch(() => {});
  }, [navigate, clearAuth, setLoggingOut]);

  return { login, logout, isLoggingIn, loginError };
};
