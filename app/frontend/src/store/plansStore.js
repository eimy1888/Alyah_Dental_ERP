import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/axiosInstance';

const usePlansStore = create(
  persist(
    (set, get) => ({
      plans: [],
      loading: false,
      error: null,

      // Fetch plans from backend API
      fetchPlans: async () => {
        set({ loading: true, error: null });
        try {
          const response = await api.get('/platform/plans'); // ✅ was '/v1/plans'
          if (response.data.success) {
            const plans = response.data.data.map(plan => ({
              id: plan.id,
              key: plan.slug,
              name: plan.name,
              monthlyPrice: plan.monthly_price,
              annualPrice: plan.annual_price,
              description: plan.description || '',
              features: plan.features || [],
              popular: plan.is_popular || false,
              max_users: plan.max_users,
              max_branches: plan.max_branches,
              max_storage_gb: plan.max_storage_gb,
            }));
            set({ plans, loading: false });
          } else {
            set({ error: 'Failed to load plans', loading: false });
          }
        } catch (error) {
          console.error('Failed to fetch plans:', error);
          set({ error: error.message || 'Network error', loading: false });
        }
      },

      // Update an existing plan via API
      updatePlan: async (id, updatedFields) => {
        set({ loading: true, error: null });
        try {
          const response = await api.put(`/platform/plans/${id}`, updatedFields); // ✅ was '/v1/platform/plans/${id}'
          if (response.data.success) {
            await get().fetchPlans();
            return { success: true };
          } else {
            set({ error: response.data.message || 'Update failed', loading: false });
            return { success: false, error: response.data.message };
          }
        } catch (error) {
          console.error('Failed to update plan:', error);
          set({ error: error.response?.data?.message || 'Network error', loading: false });
          return { success: false, error: error.response?.data?.message };
        }
      },

      // Add a new plan via API
      addPlan: async (newPlan) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/platform/plans', newPlan); // ✅ was '/v1/platform/plans'
          if (response.data.success) {
            await get().fetchPlans();
            return { success: true, data: response.data.data };
          } else {
            set({ error: response.data.message || 'Creation failed', loading: false });
            return { success: false, error: response.data.message };
          }
        } catch (error) {
          console.error('Failed to add plan:', error);
          set({ error: error.response?.data?.message || 'Network error', loading: false });
          return { success: false, error: error.response?.data?.message };
        }
      },

      // Delete a plan via API
      deletePlan: async (id) => {
        set({ loading: true, error: null });
        try {
          const response = await api.delete(`/platform/plans/${id}`); // ✅ was '/v1/platform/plans/${id}'
          if (response.data.success) {
            await get().fetchPlans();
            return { success: true };
          } else {
            set({ error: response.data.message || 'Delete failed', loading: false });
            return { success: false, error: response.data.message };
          }
        } catch (error) {
          console.error('Failed to delete plan:', error);
          set({ error: error.response?.data?.message || 'Network error', loading: false });
          return { success: false, error: error.response?.data?.message };
        }
      },
    }),
    {
      name: 'dentflow-plans',
      partialize: (state) => ({ plans: state.plans }),
    }
  )
);

export default usePlansStore;