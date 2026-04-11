import { useNavigate, useParams } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { ContentBlockRenderer } from "../components/ContentBlockRenderer";
import { ContentService } from "../data/contentService";
import { Trophy, ArrowRight } from "lucide-react";

export function AulaConclusao() {
  const { moduloId, aulaId } = useParams();
  const navigate = useNavigate();
  const mid = Number(moduloId);
  const aid = Number(aulaId);
  const aula = ContentService.getAula(mid, aid);
  const modulo = ContentService.getModulo(mid);
  const totalAulas = ContentService.getTotalAulas(mid);

  if (!aula || !modulo) return null;

  // Find next lesson
  const aulasModulo = ContentService.getAulasByModulo(mid);
  const nextAula = aulasModulo.find((a) => a.numeroAula === aid + 1);

  return (
    <ScreenLayout>
      <div className="flex flex-col items-center text-center mt-6">
        {/* Trophy */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Trophy size={40} className="text-green-600" />
        </div>

        <h2 className="mb-2">Aula Concluída!</h2>
        <p className="text-[#333] mb-4" style={{ fontSize: 14 }}>
          {aula.titulo}
        </p>

        {/* Conclusion content from planilha */}
        {aula.conclusao && aula.conclusao.length > 0 && (
          <div className="w-full mb-4">
            <ContentBlockRenderer blocks={aula.conclusao} />
          </div>
        )}

        {/* Progress card */}
        <div className="bg-white rounded-xl p-4 w-full mb-4">
          <p className="text-[#17335B] mb-2" style={{ fontSize: 12 }}>
            {modulo.titulo.toUpperCase()}
          </p>
          <div className="w-full bg-[#E4E4E4] rounded-full h-2.5">
            <div
              className="bg-[#17335B] h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(aid / totalAulas) * 100}%` }}
            />
          </div>
          <p style={{ fontSize: 12 }} className="text-[#333] mt-2">
            {aid} de {totalAulas} aulas
          </p>
        </div>

        {/* Points */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 w-full mb-6">
          <p className="text-amber-700" style={{ fontSize: 14 }}>
            +50 pontos conquistados
          </p>
        </div>

        {/* Motivational message */}
        <p className="text-[#17335B] mb-6" style={{ fontSize: 14 }}>
          {ContentService.getMotivationalMessage()}
        </p>

        {nextAula ? (
          <ActionButton
            variant="avancar"
            label="PRÓXIMA AULA"
            onClick={() => navigate(`/modulos/${mid}/aulas/${nextAula.numeroAula}`)}
          />
        ) : (
          <ActionButton
            variant="avancar"
            label="VOLTAR AOS MÓDULOS"
            onClick={() => navigate("/modulos")}
          />
        )}
      </div>
    </ScreenLayout>
  );
}