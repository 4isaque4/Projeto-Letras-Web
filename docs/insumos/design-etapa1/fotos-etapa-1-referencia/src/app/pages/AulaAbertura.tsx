import { useNavigate, useParams } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ContentService } from "../data/contentService";
import { ContentBlockRenderer } from "../components/ContentBlockRenderer";
import { ActionButton } from "../components/ActionButton";
import { Target, Layers } from "lucide-react";

export function AulaAbertura() {
  const { moduloId, aulaId } = useParams();
  const navigate = useNavigate();
  const mid = Number(moduloId);
  const aid = Number(aulaId);
  const aula = ContentService.getAula(mid, aid);
  const modulo = ContentService.getModulo(mid);

  if (!aula || !modulo) return null;

  const totalTelas = aula.telas.length;

  return (
    <ScreenLayout>
      {/* Breadcrumb */}
      <p className="text-[#17335B] mb-2" style={{ fontSize: 12 }}>
        MÓDULO {modulo.numeroModulo} · AULA {aula.numeroAula}
      </p>

      <h2 className="mb-4">{aula.titulo}</h2>

      {/* Objective card */}
      {aula.objetivo && (
        <div className="bg-white rounded-xl p-4 mb-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#17335B]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Target size={18} className="text-[#17335B]" />
          </div>
          <div>
            <p className="text-[#17335B] mb-1" style={{ fontSize: 12 }}>
              OBJETIVO
            </p>
            <p className="text-[#333]">{aula.objetivo}</p>
          </div>
        </div>
      )}

      {/* Opening media */}
      {aula.abertura && aula.abertura.length > 0 && (
        <ContentBlockRenderer blocks={aula.abertura} className="mb-4" />
      )}

      {/* Stats */}
      <div className="bg-white rounded-xl p-4 mb-6 flex items-center gap-3">
        <Layers size={18} className="text-[#17335B]" />
        <div>
          <p style={{ fontSize: 14 }}>{totalTelas} {totalTelas === 1 ? "tela" : "telas"} nesta aula</p>
          <p className="text-[#333]" style={{ fontSize: 12 }}>
            Avance no seu ritmo — sem pressa!
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <ActionButton
          variant="avancar"
          label="INICIAR AULA"
          onClick={() =>
            navigate(`/modulos/${mid}/aulas/${aid}/tela/1`)
          }
        />
      </div>
    </ScreenLayout>
  );
}
