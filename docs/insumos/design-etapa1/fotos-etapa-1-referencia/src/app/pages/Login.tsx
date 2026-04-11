import { useState } from "react";
import { useNavigate } from "react-router";
import { ActionButton } from "../components/ActionButton";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div style={{ fontFamily: "serif", fontSize: 48, fontWeight: 700, letterSpacing: -2, border: "3px solid #111", padding: "8px 20px", borderRadius: 8 }} className="mb-12">
          letras
        </div>

        <div className="w-full space-y-4 mb-8">
          <div>
            <label className="block mb-1">E-mail ou CPF</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm"
            />
          </div>
          <div>
            <label className="block mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm"
            />
          </div>
        </div>

        <ActionButton variant="avancar" label="ENTRAR" onClick={() => navigate("/modulos")} />

        <button onClick={() => navigate("/cadastro/1")} className="mt-6 text-[#17335B] underline" style={{ fontSize: 14 }}>
          Criar conta
        </button>
      </div>
    </div>
  );
}
