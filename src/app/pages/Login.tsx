import { useNavigate } from "react-router";
import { LogIn, StickyNote } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alfabetizador Online</h1>
          <p className="text-sm text-gray-600">Sistema de Gestão de Alfabetização</p>
        </div>

        {/* Login Card */}
        <div className="border-2 border-gray-300 bg-white p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">T1. Login</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Email</label>
              <input
                type="email"
                placeholder="usuario@exemplo.com"
                className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
              />
            </div>

            <div className="text-right">
              <button type="button" className="text-sm text-gray-600 hover:underline">
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </button>
          </form>
        </div>

        {/* Nota de papel (wireframe annotation) */}
        <div className="mt-6 border-2 border-gray-400 bg-yellow-50 p-4 relative">
          <StickyNote className="w-4 h-4 absolute top-2 right-2 text-gray-500" />
          <p className="text-xs text-gray-700">
            <strong>Nota:</strong> Perfis de acesso: Admin/Coordenação ou Alfabetizador (Tutor)
          </p>
        </div>
      </div>
    </div>
  );
}
