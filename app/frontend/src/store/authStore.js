// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';

// const useAuthStore = create(
//   persist(
//     (set) => ({
//       user: null,
//       token: null,
//       clinic: null,
//       branch: null,

//       setAuth: (user, token, clinic, branch) => set({
//         user: { ...user, clinic, branch },
//         token,
//         clinic,
//         branch,
//       }),

//       logout: () => set({ 
//         user: null, 
//         token: null, 
//         clinic: null, 
//         branch: null 
//       }),
//     }),
//     {
//       name: 'dentflow-auth',
//     }
//   )
// );

// export default useAuthStore;

import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  clinic: null,
  branch: null,
  isLoading: true,
  isLoggingOut: false,

  setAuth: (user, clinic, branch) =>
    set({
      user: { ...user, clinic, branch },
      clinic,
      branch,
      isLoading: false,
      isLoggingOut: false, // ← reset only on successful login
    }),

  clearAuth: () =>
    set({
      user: null,
      clinic: null,
      branch: null,
      isLoading: false,
      // ← isLoggingOut is intentionally NOT reset here
    }),

  setLoggingOut: (val) => set({ isLoggingOut: val }),

  setLoading: (isLoading) => set({ isLoading }),

  getClinicSlug: () => {
    const state = get();
    return state.clinic?.slug || state.user?.clinic?.slug || null;
  },
}));

export default useAuthStore;