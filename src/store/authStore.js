import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    user: null,
    loading: true,
    isAuthenticated: false,
    userProfile: null,
    error: null,

    setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        loading: false,
    }),

    setUserProfile: (profile) => set({ userProfile: profile }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    logout: () => set({
        user: null,
        isAuthenticated: false,
        userProfile: null,
        error: null,
    }),
}));
