import { useNavigate, useParams } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";
import { ContentBlockRenderer } from "../components/ContentBlockRenderer";
import { ContentService } from "../data/contentService";
import { MessageSquare, ClipboardList } from "lucide-react";

export function TelaConteudo() {
  const { moduloId, aulaId, telaNum } = useParams();
  const navigate = useNavigate();
  const mid = Number(moduloId);
  const aid = Number(aulaId);
  const tNum = Number(telaNum);

  const telasAula = ContentService.getTelasByAula(mid, aid);
  const tela = telasAula.find((t) => t.numeroTela === tNum);
  const total = telasAula.length;
  const atividadesTela = tela?.atividades ?? [];

  if (!tela) return null;

  const goNext = () => {
    if (atividadesTela.length > 0) {
      navigate(`/modulos/${mid}/aulas/${aid}/tela/${tNum}/atividade/1`);
    } else if (tNum < total) {
      navigate(`/modulos/${mid}/aulas/${aid}/tela/${tNum + 1}`);
    } else {
      navigate(`/modulos/${mid}/aulas/${aid}/conclusao`);
    }
  };

  const goBack = () => {
    if (tNum > 1) navigate(`/modulos/${mid}/aulas/${aid}/tela/${tNum - 1}`);
    else navigate(`/modulos/${mid}/aulas/${aid}`);
  };

  return (
    <ScreenLayout>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#17335B]" style={{ fontSize: 12 }}>
          Módulo {mid} · Aula {aid}
        </span>
        <span className="text-[#333]" style={{ fontSize: 12 }}>
          {tNum} de {total}
        </span>
      </div>
      <div className="w-full bg-[#E4E4E4] rounded-full h-2.5 mb-5">
        <div
          className="bg-[#17335B] h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${(tNum / total) * 100}%` }}
        />
      </div>

      {/* Title */}
      {tela.titulo && <h3 className="mb-4">{tela.titulo}</h3>}

      {/* Dynamic content blocks */}
      {tela.conteudo.length > 0 && (
        <ContentBlockRenderer blocks={tela.conteudo} className="mb-4" />
      )}

      {/* Educator guidance */}
      {tela.orientacaoParaAlfabetizador && (
        <div className="bg-[#17335B]/8 rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={16} className="text-[#17335B]" />
            <p style={{ fontSize: 12 }} className="text-[#17335B]">
              Orientação para o Alfabetizador
            </p>
          </div>
          <p style={{ fontSize: 14 }} className="text-[#333] whitespace-pre-line">
            {tela.orientacaoParaAlfabetizador}
          </p>
        </div>
      )}

      {/* Student speech suggestion */}
      {tela.orientacaoParaAlfabetizando && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-green-700" />
            <p style={{ fontSize: 12 }} className="text-green-700">
              Fala sugerida para o Alfabetizando
            </p>
          </div>
          <p style={{ fontSize: 14 }} className="text-[#333] whitespace-pre-line">
            {tela.orientacaoParaAlfabetizando}
          </p>
        </div>
      )}

      {/* Encouragement when halfway */}
      {tNum === Math.ceil(total / 2) && total > 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
          <p style={{ fontSize: 13 }} className="text-amber-700">
            Metade da aula! Continue assim!
          </p>
        </div>
      )}

      {/* Activities hint */}
      {atividadesTela.length > 0 && (
        <div className="bg-[#17335B]/5 rounded-xl p-3 mb-4 text-center">
          <p style={{ fontSize: 13 }} className="text-[#17335B]">
            {atividadesTela.length === 1 ? "1 atividade" : `${atividadesTela.length} atividades`} a seguir
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-around mt-4">
        <ActionButton variant="voltar" onClick={goBack} />
        <ActionButton variant="avancar" onClick={goNext} />
      </div>
    </ScreenLayout>
  );
}