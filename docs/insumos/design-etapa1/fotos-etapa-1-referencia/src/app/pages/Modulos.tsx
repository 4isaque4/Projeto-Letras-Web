import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ContentService } from "../data/contentService";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";

export function Modulos() {
  const navigate = useNavigate();
  const modulos = ContentService.getModulos();

  return (
    <ScreenLayout>
      {/* Welcome section */}
      <div className="mb-6">
        <h2 className="mb-1">Seus Módulos</h2>
        <p className="text-[#333]" style={{ fontSize: 14 }}>
          Escolha um módulo para começar a aprender
        </p>
      </div>

      <div className="space-y-3">
        {modulos.map((m, idx) => {
          const totalAulas = m.aulas.length;

          return (
            <button
              key={m.id}
              onClick={() => navigate(`/modulos/${m.numeroModulo}/aulas`)}
              className="w-full bg-white rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#17335B]/10 flex items-center justify-center">
                    <BookOpen size={20} className="text-[#17335B]" />
                  </div>
                  <div>
                    <p className="text-[#111]">
                      Módulo {m.numeroModulo}
                    </p>
                    <p className="text-[#333]" style={{ fontSize: 13 }}>
                      {m.titulo}
                    </p>
                    <p className="text-[#333]" style={{ fontSize: 12 }}>
                      {totalAulas} {totalAulas === 1 ? "aula" : "aulas"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#333]" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Motivational card */}
      <div className="mt-6 bg-white rounded-xl p-4 flex items-center gap-3">
        <Sparkles size={20} className="text-[#17335B]" />
        <p className="text-[#333]" style={{ fontSize: 14 }}>
          {ContentService.getMotivationalMessage()}
        </p>
      </div>
    </ScreenLayout>
  );
}