import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../core/auth/AuthProvider";
import { startRealtimeBridge, stopRealtimeBridge } from "../core/realtime/realtimeBootstrap";
import { ConfirmProvider } from "./ConfirmDialog";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const location = useLocation();
  const { status, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user || user.role === "alfabetizando") {
      stopRealtimeBridge();
      return;
    }

    startRealtimeBridge();

    return () => {
      stopRealtimeBridge();
    };
  }, [isAuthenticated, user?.id, user?.role]);

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
    <ConfirmProvider>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar userRole={userRole} />
        <div className="min-w-0 flex-1 flex flex-col">
          <Topbar />
          <main className="min-w-0 flex-1 bg-gray-100 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
