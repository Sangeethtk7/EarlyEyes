import { create } from "zustand";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  loading: boolean;
  toasts: ToastItem[];
  setLoading: (loading: boolean) => void;
  addToast: (message: string, type: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  loading: false,
  toasts: [],
  setLoading: (loading) => set({ loading }),
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useUIStore;
