import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { useAuthStore } from "../store/authStore";
import { useToast } from "./useToast";

/**
 * Custom hook wrapping all authentication API calls with React Query.
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);

  // 1. Login Mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
      role: "parent" | "clinician";
    }) => {
      const response = await api.post("/api/auth/login", credentials);
      return response.data;
    },
    onSuccess: (res) => {
      if (res.success && res.data) {
        const { user: userData, access_token, refresh_token } = res.data;
        setAuth(userData, access_token, refresh_token);
        toast(`Welcome back, ${userData.full_name}!`, "success");
        if (userData.role === "parent") {
          navigate("/parent/dashboard");
        } else {
          navigate("/clinician/dashboard");
        }
      }
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  // 2. Parent Signup Mutation
  const signupParentMutation = useMutation({
    mutationFn: async (payload: any) => {
      // First register the parent account
      const response = await api.post("/api/auth/signup/parent", {
        full_name: payload.full_name,
        email: payload.email,
        password: payload.password,
        confirm_password: payload.confirm_password,
        agreed_to_disclaimer: payload.agreed_to_disclaimer,
      });
      return { response: response.data, credentials: { email: payload.email, password: payload.password } };
    },
    onSuccess: async ({ credentials }) => {
      // Auto-login on successful registration
      try {
        await loginMutation.mutateAsync({
          email: credentials.email,
          password: credentials.password,
          role: "parent",
        });
      } catch (loginErr: any) {
        toast("Account created. Please sign in manually.", "info");
        navigate("/login");
      }
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  // 3. Clinician Signup Mutation
  const signupClinicianMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post("/api/auth/signup/clinician", payload);
      return response.data;
    },
    onSuccess: () => {
      toast("Clinician registration submitted.", "success");
      // Redirects to pending screen handled by signup component
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  // 4. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await api.post("/api/auth/logout", { refresh_token: refreshToken });
      }
    },
    onSettled: () => {
      clearAuth();
      toast("You have been signed out.", "info");
      navigate("/login");
    },
  });

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.message || null,

    signupParent: signupParentMutation.mutate,
    isSigningUpParent: signupParentMutation.isPending,

    signupClinician: signupClinicianMutation.mutate,
    isSigningUpClinician: signupClinicianMutation.isPending,
    isClinicianSignupSuccess: signupClinicianMutation.isSuccess,

    logout: logoutMutation.mutate,
    user,
  };
};

export default useAuth;
