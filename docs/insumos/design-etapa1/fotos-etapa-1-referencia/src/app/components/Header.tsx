import { Bell } from "lucide-react";
import { useNavigate } from "react-router";

export function Header() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white">
      <div
        className="cursor-pointer"
        onClick={() => navigate("/")}
        style={{ fontFamily: "serif", fontSize: 28, fontWeight: 700, letterSpacing: -1 }}
      >
        <span style={{ border: "2px solid #111", padding: "2px 6px", borderRadius: 4 }}>
          letras
        </span>
      </div>
      <div className="relative cursor-pointer">
        <Bell size={24} />
        <span className="absolute -top-1 -right-1 bg-[#17335B] text-white rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: 10 }}>
          1
        </span>
      </div>
    </div>
  );
}
