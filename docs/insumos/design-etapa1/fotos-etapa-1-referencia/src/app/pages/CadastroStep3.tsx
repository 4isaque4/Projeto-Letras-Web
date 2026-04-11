import { useState } from "react";
import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { Linkedin, Facebook, Instagram } from "lucide-react";

export function CadastroStep3() {
  const navigate = useNavigate();
  const [escolaridade, setEscolaridade] = useState("");
  const [area, setArea] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");

  return (
    <ScreenLayout showNav={false}>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">Grau de Escolaridade</label>
          <select value={escolaridade} onChange={(e) => setEscolaridade(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm">
            <option value="">Selecione</option>
            <option>Ensino Fundamental</option>
            <option>Ensino Médio</option>
            <option>Ensino Superior</option>
            <option>Pós-Graduação</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Área de Formação</label>
          <input value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
        </div>

        <p className="text-[#333] mt-4" style={{ fontSize: 14 }}>
          Informe suas redes sociais. Você poderá divulgar as conquistas de seus alfabetizandos.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Linkedin size={24} />
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="flex-1 bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
          </div>
          <div className="flex items-center gap-3">
            <Facebook size={24} />
            <input value={facebook} onChange={(e) => setFacebook(e.target.value)} className="flex-1 bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
          </div>
          <div className="flex items-center gap-3">
            <Instagram size={24} />
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="flex-1 bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 20, fontWeight: 700 }}>𝕏</span>
            <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="flex-1 bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-12">
        <ActionButton variant="avancar" onClick={() => navigate("/cadastro/confirmar")} />
      </div>
    </ScreenLayout>
  );
}
