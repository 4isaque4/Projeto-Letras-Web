import { Navigate } from "react-router";
import { useAuth } from "../core/auth/AuthProvider";

export default function HomeRedirect() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-700">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const destination = user.role === "tutor" ? "/tutor/dashboard" : "/admin/dashboard";
  return <Navigate to={destination} replace />;
}
