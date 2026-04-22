import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { LoaderCircle, LogIn } from "lucide-react";
import { useAuth } from "../core/auth/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { status, isAuthenticated, user, warnings, signIn, requestPasswordReset } = useAuth();

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);

    signIn(email.trim(), password)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Erro ao autenticar.";
        setErrorMessage(message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleForgotPassword = async () => {
    try {
      setErrorMessage("");
      setInfoMessage("");
      setIsResettingPassword(true);
      await requestPasswordReset(email.trim());
      setInfoMessage("Se o email existir, voce recebera instrucoes para redefinir a senha.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao solicitar recuperacao de senha.";
      setErrorMessage(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isAuthenticated && user) {
    const destination = user.role === "tutor" ? "/tutor/dashboard" : "/admin/dashboard";
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alfabetizador Online</h1>
          <p className="text-sm text-gray-600">Sistema de Gestao de Alfabetizacao</p>
        </div>

        <div className="border-2 border-gray-300 bg-white p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">T1. Login</h2>

          {status === "loading" && !isSubmitting && (
            <div className="mb-4 border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              Validando sessao ativa...
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-4 border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@exemplo.com"
                className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                required
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className="text-sm text-gray-600 hover:underline disabled:opacity-60"
              >
                {isResettingPassword ? "Enviando..." : "Esqueci minha senha"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-3 hover:bg-gray-700 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>

            {errorMessage && <p className="text-xs text-red-700">{errorMessage}</p>}
            {infoMessage && <p className="text-xs text-emerald-700">{infoMessage}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
