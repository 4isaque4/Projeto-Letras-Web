import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { ContentBlockRenderer } from "../components/ContentBlockRenderer";
import { ContentService, type ActivityContent } from "../data/contentService";
import { CheckCircle2, XCircle, ClipboardList, MessageSquare } from "lucide-react";

export function AtividadeTela() {
  const { moduloId, aulaId, telaNum, atividadeNum } = useParams();
  const navigate = useNavigate();
  const mid = Number(moduloId);
  const aid = Number(aulaId);
  const tNum = Number(telaNum);
  const aNum = Number(atividadeNum);

  const atividadesTela = ContentService.getAtividadesByTela(mid, aid, tNum);
  const atividade = atividadesTela.find((a) => a.numeroAtividade === aNum);

  const totalTelas = ContentService.getTotalTelas(mid, aid);

  const [completed, setCompleted] = useState(false);

  if (!atividade) return null;

  const totalAtividades = atividadesTela.length;

  const continuar = () => {
    if (aNum < totalAtividades) {
      navigate(`/modulos/${mid}/aulas/${aid}/tela/${tNum}/atividade/${aNum + 1}`);
    } else if (tNum < totalTelas) {
      navigate(`/modulos/${mid}/aulas/${aid}/tela/${tNum + 1}`);
    } else {
      navigate(`/modulos/${mid}/aulas/${aid}/conclusao`);
    }
  };

  return (
    <ScreenLayout>
      {/* Progress */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#17335B]" style={{ fontSize: 12 }}>
          Atividade {aNum} de {totalAtividades}
        </span>
      </div>
      <div className="w-full bg-[#E4E4E4] rounded-full h-2.5 mb-5">
        <div
          className="bg-[#17335B] h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${(aNum / totalAtividades) * 100}%` }}
        />
      </div>

      {/* Title */}
      {atividade.titulo && <h3 className="mb-4">{atividade.titulo}</h3>}

      {/* Dynamic content */}
      {atividade.conteudo.length > 0 && (
        <ContentBlockRenderer blocks={atividade.conteudo} className="mb-4" />
      )}

      {/* Educator guidance */}
      {atividade.orientacaoParaAlfabetizador && (
        <div className="bg-[#17335B]/8 rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={16} className="text-[#17335B]" />
            <p style={{ fontSize: 12 }} className="text-[#17335B]">
              Orientação para o Alfabetizador
            </p>
          </div>
          <p style={{ fontSize: 14 }} className="text-[#333] whitespace-pre-line">
            {atividade.orientacaoParaAlfabetizador}
          </p>
        </div>
      )}

      {/* Student guidance */}
      {atividade.orientacaoParaAlfabetizando && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-green-700" />
            <p style={{ fontSize: 12 }} className="text-green-700">
              Fala sugerida para o Alfabetizando
            </p>
          </div>
          <p style={{ fontSize: 14 }} className="text-[#333] whitespace-pre-line">
            {atividade.orientacaoParaAlfabetizando}
          </p>
        </div>
      )}

      {/* Completion feedback */}
      {completed && atividade.conclusao && atividade.conclusao.length > 0 && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 mb-4 flex items-start gap-3">
          <CheckCircle2 size={24} className="text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p style={{ fontSize: 14 }} className="text-green-800 mb-2">
              Muito bem!
            </p>
            <ContentBlockRenderer blocks={atividade.conclusao} />
          </div>
        </div>
      )}

      {/* Action */}
      <div className="flex justify-center mt-6">
        {!completed ? (
          <ActionButton
            variant="confirmar"
            label="CONCLUIR"
            onClick={() => setCompleted(true)}
          />
        ) : (
          <ActionButton
            variant="avancar"
            label="CONTINUAR"
            onClick={continuar}
          />
        )}
      </div>
    </ScreenLayout>
  );
}
