import { useState } from "react";
import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { Camera } from "lucide-react";

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function CadastroStep2() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");

  return (
    <ScreenLayout showNav={false}>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">Nome completo</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
        <div>
          <label className="block mb-1">Data de Nascimento</label>
          <input value={nascimento} onChange={(e) => setNascimento(e.target.value)} placeholder="DD/MM/AAAA" className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
        <div>
          <label className="block mb-1">UF</label>
          <select value={uf} onChange={(e) => setUf(e.target.value)} className="bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm">
            <option value="">Selecione</option>
            {UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">Cidade</label>
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>
        <div>
          <label className="block mb-1">Faça o upload ou tire uma foto do alfabetizando.</label>
          <div className="w-16 h-16 bg-[#E4E4E4] border border-border rounded flex items-center justify-center cursor-pointer">
            <Camera size={24} className="text-[#333]" />
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-12">
        <ActionButton variant="avancar" onClick={() => navigate("/cadastro/3")} />
      </div>
    </ScreenLayout>
  );
}
