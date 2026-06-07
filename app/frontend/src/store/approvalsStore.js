import { create } from 'zustand';

const useApprovalsStore = create((set, get) => ({
  pendingCount: 0, // ← start at 0, not 2
  clinics: [],

  refreshPendingCount: (clinics) => {
    const count = (clinics ?? get().clinics).filter(
      (c) => c.status === 'pending_platform_approval' // ← correct status string
    ).length;
    set({ pendingCount: count });
  },

  setClinics: (clinics) => {
    set({ clinics });
    get().refreshPendingCount(clinics);
  },
}));

export default useApprovalsStore;