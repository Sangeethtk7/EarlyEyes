import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and parse custom errors
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger auto-refresh on unauthenticated 401 statuses
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        // Redirecting using standard window location
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          "http://localhost:8000/api/auth/refresh",
          { refresh_token: refreshToken }
        );

        const { success, data } = refreshResponse.data;
        if (success && data?.access_token) {
          const { user, access_token, refresh_token } = data;
          useAuthStore.getState().setAuth(
            user || useAuthStore.getState().user,
            access_token,
            refresh_token || refreshToken
          );

          processQueue(null, access_token);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } else {
          throw new Error("Refresh token exchange failed");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Process human-readable errors: extract backend details
    let errorMsg = "An unexpected error occurred. Please try again.";
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.message === "string") {
        errorMsg = data.message;
      } else if (typeof data.detail === "string") {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
        errorMsg = data.detail[0].msg;
      } else if (data.error && typeof data.error === "string") {
        errorMsg = data.error;
      }
    } else if (error.message) {
      errorMsg = error.message;
    }

    return Promise.reject(new Error(errorMsg));
  }
);

export default api;
