// // src/store/tenantStore.js

// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';

// const HARDCODED_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// const useTenantStore = create(
//   persist(
//     (set, get) => ({
//       // -------------------------------------------------------
//       // State
//       // -------------------------------------------------------
//       tenantId:   HARDCODED_TENANT_ID,
//       clinicName: 'Uptown Branch – Addis Ababa',
//       branch:     'Uptown Branch',
//       city:       'Addis Ababa',

//       // -------------------------------------------------------
//       // Actions
//       // -------------------------------------------------------
//       setTenant: (tenantId, clinicName) => {
//         set({ tenantId, clinicName });
//       },

//       // -------------------------------------------------------
//       // Selectors
//       // -------------------------------------------------------
//       getTenantId: () => {
//         return get().tenantId ?? HARDCODED_TENANT_ID;
//       },

//       getClinicName: () => {
//         return get().clinicName ?? 'DentFlow Pro';
//       },
//     }),

//     {
//       name:    'dentflow-tenant',
//       storage: createJSONStorage(() => localStorage),
//     }
//   )
// );

// export default useTenantStore;