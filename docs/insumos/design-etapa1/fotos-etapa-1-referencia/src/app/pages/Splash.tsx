import { useEffect } from "react";
import { useNavigate } from "react-router";

export function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/login"), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-md mx-auto">
      <div style={{ fontFamily: "serif", fontSize: 48, fontWeight: 700, letterSpacing: -2, border: "3px solid #111", padding: "8px 20px", borderRadius: 8 }}>
        letras
      </div>
      <p className="mt-4 text-[#333]" style={{ fontSize: 14 }}>Educador</p>
      <div className="mt-8 w-8 h-8 border-2 border-[#17335B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
