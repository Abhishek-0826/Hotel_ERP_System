import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "../ui/LoadingState";
import { getRoleHome } from "../../utils/roles";
import { getProfilePath } from "../../utils/navigation";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState label="Checking your session…" />;
  }

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          notice: "Please sign in to access this service.",
        }}
      />
    );
  }

  // A new hotel owner must set a real password and complete the hotel profile first.
  if (
    user.role === "OWNER" &&
    (user.mustChangePassword || (user.tenant && !user.tenant.onboardingCompleted)) &&
    location.pathname !== "/owner/setup"
  ) {
    return <Navigate to="/owner/setup" replace />;
  }

  // A password reset by an owner/admin leaves a temporary password: make the user choose their own.
  const accountPath = getProfilePath(user.role);
  if (user.mustChangePassword && user.role !== "OWNER" && location.pathname !== accountPath) {
    return <Navigate to={accountPath} replace state={{ mustChangePassword: true }} />;
  }

  // User has wrong role
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return children;
}
