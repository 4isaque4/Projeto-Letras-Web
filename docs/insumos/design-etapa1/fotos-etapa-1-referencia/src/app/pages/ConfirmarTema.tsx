import { useNavigate, useParams } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { ContentService } from "../data/contentService";

export function ConfirmarTema() {
  const navigate = useNavigate();
  const { moduloId } = useParams();
  const mid = Number(moduloId);
  const modulo = ContentService.getModulo(mid);

  if (!modulo) return null;

  return (
    <ScreenLayout>
      <p className="mb-4">
        Você selecionou o tema <strong>{modulo.titulo}</strong>.
      </p>

      <p className="mb-2" style={{ fontWeight: 600 }}>Indicação do tema:</p>
      <p className="text-[#333] mb-6">
        Este módulo contém {modulo.aulas.length}{" "}
        {modulo.aulas.length === 1 ? "aula" : "aulas"}. O aprendiz será guiado
        por telas de conteúdo e atividades interativas ao longo da jornada.
      </p>

      <p className="text-[#333] mb-8">
        Uma vez iniciada a alfabetização, não será possível trocar de tema. Você
        confirma sua escolha de tema?
      </p>

      <div className="flex justify-around">
        <ActionButton variant="voltar" onClick={() => navigate("/modulos")} />
        <ActionButton
          variant="confirmar"
          onClick={() => navigate(`/modulos/${mid}/aulas`)}
        />
      </div>
    </ScreenLayout>
  );
}
