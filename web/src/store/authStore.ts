import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (
    user: User | null,
    accessToken: string | null,
    refreshToken: string | null
  ) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isParent: () => boolean;
  isClinician: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => !!get().accessToken,
      isParent: () => get().user?.role === "parent",
      isClinician: () => get().user?.role === "clinician",
    }),
    {
      name: "earlyeyes-auth-storage",
    }
  )
);

export default useAuthStore;
