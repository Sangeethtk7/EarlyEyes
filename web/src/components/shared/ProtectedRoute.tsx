import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard component that redirects to login if the user is not authenticated.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const token = useAuthStore((state) => state.accessToken);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
