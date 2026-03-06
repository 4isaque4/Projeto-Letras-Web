import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  // Em produção, isso viria de um contexto de autenticação
  const userRole = 'admin'; // ou 'tutor'

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
