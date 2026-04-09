import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../core/auth/AuthProvider";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const location = useLocation();
  const { status, isAuthenticated, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-700">Carregando sessao...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "alfabetizando") {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "tutor" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/tutor/dashboard" replace />;
  }

  if (user.role === "admin" && location.pathname.startsWith("/tutor")) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const userRole = user.role === "tutor" ? "tutor" : "admin";

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6 bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
