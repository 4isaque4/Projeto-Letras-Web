import { useNavigate, useParams } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ContentService } from "../data/contentService";
import { Play, ChevronRight, Target } from "lucide-react";

export function Aulas() {
  const { moduloId } = useParams();
  const navigate = useNavigate();
  const mid = Number(moduloId);
  const modulo = ContentService.getModulo(mid);
  const aulasModulo = ContentService.getAulasByModulo(mid);

  if (!modulo) return null;

  return (
    <ScreenLayout>
      <div className="mb-6">
        <p className="text-[#17335B] mb-1" style={{ fontSize: 12 }}>
          MÓDULO {modulo.numeroModulo}
        </p>
        <h2 className="mb-1">{modulo.titulo}</h2>
        <p className="text-[#333]" style={{ fontSize: 14 }}>
          {aulasModulo.length} {aulasModulo.length === 1 ? "aula" : "aulas"} disponíveis
        </p>
      </div>

      <div className="space-y-3">
        {aulasModulo.map((a) => {
          const totalTelas = a.telas.length;

          return (
            <button
              key={a.id}
              onClick={() =>
                navigate(`/modulos/${mid}/aulas/${a.numeroAula}`)
              }
              className="w-full bg-white rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#17335B]/10 flex items-center justify-center shrink-0">
                    <Play size={18} className="text-[#17335B] ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#111] truncate">
                      Aula {a.numeroAula} – {a.titulo}
                    </p>
                    {a.objetivo && (
                      <div className="flex items-start gap-1 mt-1">
                        <Target size={12} className="text-[#17335B] mt-0.5 shrink-0" />
                        <p className="text-[#333]" style={{ fontSize: 12 }}>
                          {a.objetivo}
                        </p>
                      </div>
                    )}
                    <p className="text-[#333] mt-1" style={{ fontSize: 11 }}>
                      {totalTelas} {totalTelas === 1 ? "tela" : "telas"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#333] shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Encouragement */}
      <div className="mt-6 bg-[#17335B]/5 rounded-xl p-4 text-center">
        <p className="text-[#17335B]" style={{ fontSize: 14 }}>
          Cada aula é um passo a mais na sua jornada.
        </p>
      </div>
    </ScreenLayout>
  );
}