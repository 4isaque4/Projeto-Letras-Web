import { Home, FileText, Users, Award, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router";

const items = [
  { icon: Home, label: "início", path: "/modulos" },
  { icon: FileText, label: "tutoriais", path: "/tutoriais" },
  { icon: Users, label: "acompanhar", path: "/acompanhar" },
  { icon: Award, label: "pontuação", path: "/pontuacao" },
  { icon: User, label: "perfil", path: "/perfil" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around py-2 z-50">
      {items.map((item) => {
        const active = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 ${active ? "text-[#17335B]" : "text-[#333]"}`}
          >
            <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span style={{ fontSize: 11 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
