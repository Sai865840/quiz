import { create } from 'zustand';

export const useUIStore = create((set) => ({
    isOnline: navigator.onLine,
    sidebarCollapsed: false,
    accentColor: '#6C63FF',
    fontSize: 'medium',
    toasts: [],

    setIsOnline: (isOnline) => set({ isOnline }),

    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    setAccentColor: (color) => {
        document.documentElement.style.setProperty('--primary', color);
        set({ accentColor: color });
    },

    setFontSize: (size) => {
        document.documentElement.setAttribute('data-font-size', size);
        set({ fontSize: size });
    },

    addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { id: Date.now(), ...toast }],
    })),

    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
