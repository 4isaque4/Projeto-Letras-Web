import { useState } from "react";
import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { User, Users, ArrowRight } from "lucide-react";

const gruposExistentes = ["Grupo de Alfabetizandos 3", "Grupo de Alfabetizandos 4", "Grupo de Alfabetizandos 5"];

export function ModoEnsino() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"individual" | "grupo" | null>(null);
  const [nomeGrupo, setNomeGrupo] = useState("");

  return (
    <ScreenLayout showNav={true}>
      <p className="mb-6">XXXXXXX XXXXXXXX será alfabetizando individualmente ou em um grupo?</p>

      <div className="flex flex-col items-center gap-6 mb-8">
        <button
          onClick={() => setModo("individual")}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg w-full ${modo === "individual" ? "bg-white ring-2 ring-[#17335B]" : ""}`}
        >
          <User size={40} />
          <span>INDIVIDUALMENTE</span>
        </button>

        <button
          onClick={() => setModo("grupo")}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg w-full ${modo === "grupo" ? "bg-white ring-2 ring-[#17335B]" : ""}`}
        >
          <Users size={40} />
          <span>EM GRUPO</span>
        </button>
      </div>

      {modo === "grupo" && (
        <div className="space-y-4">
          <div>
            <p className="mb-1" style={{ fontWeight: 600 }}>CRIAR NOVO GRUPO</p>
            <p className="mb-2 text-[#333]" style={{ fontSize: 14 }}>Informe o nome do novo grupo:</p>
            <div className="flex items-center gap-2">
              <input value={nomeGrupo} onChange={(e) => setNomeGrupo(e.target.value)} className="flex-1 bg-[#E4E4E4] border-b-2 border-[#111] px-3 py-2 rounded-sm" />
              <ArrowRight size={28} className="text-[#17335B] cursor-pointer" />
            </div>
          </div>

          <p className="text-[#333]">OU</p>

          <div>
            <p className="mb-2" style={{ fontWeight: 600 }}>INCLUIR NO GRUPO:</p>
            {gruposExistentes.map((g) => (
              <button key={g} onClick={() => navigate("/modo/confirmar-grupo")} className="block w-full text-left px-2 py-3 border-b border-border hover:bg-white">
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {modo === "individual" && (
        <div className="flex justify-center mt-8">
          <ActionButton variant="avancar" onClick={() => navigate("/modulos")} />
        </div>
      )}
    </ScreenLayout>
  );
}
