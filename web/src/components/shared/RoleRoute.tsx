import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface RoleRouteProps {
  children: ReactNode;
  allowedRole: "parent" | "clinician";
}

/**
 * Route guard component that restricts access to parents or clinicians.
 */
export const RoleRoute = ({ children, allowedRole }: RoleRouteProps) => {
  const user = useAuthStore((state) => state.user);

  if (!user || user.role !== allowedRole) {
    if (user?.role === "parent") {
      return <Navigate to="/parent/dashboard" replace />;
    } else if (user?.role === "clinician") {
      return <Navigate to="/clinician/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
