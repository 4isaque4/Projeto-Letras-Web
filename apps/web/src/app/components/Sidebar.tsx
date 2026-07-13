import { Link } from "react-router";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Link2,
  Inbox,
  FileText,
  Trophy,
  FileBarChart,
  Settings,
  BookOpenCheck
} from "lucide-react";

interface SidebarProps {
  userRole?: 'admin' | 'tutor';
}

export default function Sidebar({ userRole = 'admin' }: SidebarProps) {
  const adminItems = [
    { icon: LayoutDashboard, label: "Dashboard Geral", path: "/admin/dashboard" },
    { icon: Users, label: "Alfabetizandos", path: "/admin/alfabetizandos" },
    { icon: UserCheck, label: "Alfabetizadores", path: "/admin/alfabetizadores" },
    { icon: Link2, label: "Vínculos e Convites", path: "/admin/vinculos" },
    { icon: BookOpenCheck, label: "Trilha de aulas", path: "/admin/trilha-de-aulas" },
    { icon: Inbox, label: "Fila de Atendimento", path: "/admin/fila" },
    { icon: FileText, label: "Aulas e Mídias", path: "/admin/conteudo" },
    { icon: Trophy, label: "Pontuação & Ranking", path: "/admin/ranking" },
    { icon: FileBarChart, label: "Relatórios", path: "/admin/relatorios" },
    { icon: Settings, label: "Configurações", path: "/admin/configuracoes" },
  ];

  const tutorItems = [
    { icon: LayoutDashboard, label: "Meu Dashboard", path: "/tutor/dashboard" },
    { icon: Users, label: "Meus Alfabetizandos", path: "/tutor/alfabetizandos" },
    { icon: Inbox, label: "Fila de Atendimento", path: "/tutor/fila" },
    { icon: Trophy, label: "Pontuação & Ranking", path: "/tutor/ranking" },
    { icon: Settings, label: "Configurações", path: "/tutor/configuracoes" },
  ];

  const items = userRole === 'admin' ? adminItems : tutorItems;

  return (
    <aside className="w-64 border-r border-gray-300 bg-gray-50 p-4 flex flex-col">
      <div className="mb-8 pb-4 border-b border-gray-300">
        <img src="/logo-letras.png" alt="Letras" className="h-14 w-auto object-contain" />
        <p className="text-xs text-gray-500 mt-2">
          {userRole === 'admin' ? 'Admin/Coordenação' : 'Alfabetizador'}
        </p>
      </div>
      
      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-400 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
