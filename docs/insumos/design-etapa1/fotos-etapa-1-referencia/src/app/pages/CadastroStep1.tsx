import { useState } from "react";
import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";

export function CadastroStep1() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [celular, setCelular] = useState("");

  return (
    <ScreenLayout showNav={false}>
      <p className="mb-6 text-[#333]">Insira o CPF ou passaporte da pessoa que será alfabetizada.</p>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">CPF</label>
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
        <div>
          <label className="block mb-1">E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
        <div>
          <label className="block mb-1">Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
        <div>
          <label className="block mb-1">Celular</label>
          <input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="(XX) XXXXX-XXXX" className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
      </div>

      <div className="flex justify-center mt-12">
        <ActionButton variant="avancar" onClick={() => navigate("/cadastro/2")} />
      </div>
    </ScreenLayout>
  );
}
