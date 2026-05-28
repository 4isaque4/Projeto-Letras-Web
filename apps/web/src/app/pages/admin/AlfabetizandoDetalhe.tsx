import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Lock,
  HelpCircle,
  UserPlus,
  Bell,
  CheckCircle2,
  AlertOctagon,
  Activity as ActivityIcon,
} from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPatch } from "../../core/api/client";

// B3 2026-05-17: timeline visual no detalhe do alfabetizando (decisao codex).
// Mapeia queueType + status para icone + cor, agrupando por dia.
function timelineVisual(event: HistoryItem): { Icon: typeof HelpCircle; tone: string } {
  if (event.queueType === "ajuda") {
    return event.status === "resolvido"
      ? { Icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" }
      : { Icon: HelpCircle, tone: "text-amber-600 bg-amber-50 border-amber-200" };
  }
  if (event.queueType === "progresso") {
    return event.status === "travado"
      ? { Icon: AlertOctagon, tone: "text-red-600 bg-red-50 border-red-200" }
      : { Icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  }
  if (event.queueType === "vinculo") {
    return { Icon: UserPlus, tone: "text-blue-600 bg-blue-50 border-blue-200" };
  }
  if (event.queueType === "notificacao") {
    return { Icon: Bell, tone: "text-gray-600 bg-gray-50 border-gray-200" };
  }
  return { Icon: ActivityIcon, tone: "text-gray-600 bg-gray-50 border-gray-200" };
}

function dayBucket(date: string): string {
  // Formato 'dd/mm/yyyy hh:mm' do formatDateTime → quebra no espaco.
  const datePart = date.split(" ")[0] ?? date;
  return datePart;
}

interface ProgressByStage {
  etapa: string;
  atividades: number;
  concluidas: number;
  progresso: number;
}

interface AttemptItem {
  id: string;
  atividade: string;
  data: string;
  acertos: number;
  erros: number;
  taxa: string;
}

interface SubmissionItem {
  id: string;
  tipo: string;
  atividade: string;
  data: string;
  status: string;
}

interface HistoryItem {
  id: string;
  tipo: string;
  data: string;
  usuario: string;
  obs: string;
  status?: string;
  queueType?: "ajuda" | "progresso" | "vinculo" | "notificacao" | string;
  actionable?: boolean;
}

interface StudentDetailResponse {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  tutor: string;
  grupo: string;
  etapa: string;
  status: string;
  progresso: ProgressByStage[];
  tentativas: AttemptItem[];
  submissoes: SubmissionItem[];
  historico: HistoryItem[];
}

export default function AlfabetizandoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setError("ID do alfabetizando nao informado.");
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await apiGet(`/cadastros/alfabetizandos/${id}`)) as StudentDetailResponse;
        if (!active) {
          return;
        }
        setDetail(response);
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar detalhe do alfabetizando.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id, reloadToken]);

  const statusLabel = useMemo(() => {
    if (!detail?.status) {
      return "";
    }
    return detail.status;
  }, [detail?.status]);

  const runHistoryAction = async (history: HistoryItem) => {
    if (!history.actionable || actionLoadingId) {
      return;
    }

    const action = history.queueType === "progresso" ? "desbloquear" : "resolver";

    try {
      setActionLoadingId(history.id);
      setError("");
      await apiPatch(`/painel/fila/${history.id}`, {
        action,
        reason: "Resolvido pelo detalhe do alfabetizando",
        responseMessage: action === "resolver" ? "Pode continuar a atividade" : undefined,
        decidedBy: "painel-web",
      });
      setReloadToken((value) => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Falha ao atualizar historico.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 border border-gray-400 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detalhe do Alfabetizando</h1>
          <p className="text-sm text-gray-600 mt-1">Acompanhamento completo do progresso e histórico</p>
        </div>
        {detail?.status === "travado" && (
          <div className="px-4 py-2 border border-gray-900 bg-gray-900 text-white flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4" />
            Aluno travado
          </div>
        )}
      </div>

      {loading ? (
        <StateDisplay type="loading" />
      ) : error ? (
        <StateDisplay type="error" message={error} />
      ) : !detail ? (
        <StateDisplay type="empty" message="Alfabetizando nao encontrado." />
      ) : (
        <>
          <div className="border border-gray-300 bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Nome</p>
                <p className="text-sm font-bold text-gray-900">{detail.nome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-700">{detail.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Telefone</p>
                <p className="text-sm text-gray-700">{detail.telefone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">CPF</p>
                <p className="text-sm text-gray-700">{detail.cpf || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tutor</p>
                <p className="text-sm text-gray-700">{detail.tutor}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Grupo</p>
                <p className="text-sm text-gray-700">{detail.grupo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Etapa Atual</p>
                <p className="text-sm text-gray-700">{detail.etapa}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className="px-2 py-1 text-xs border border-gray-400 inline-block">{statusLabel}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-300 bg-white">
            <div className="p-4 border-b border-gray-300">
              <h3 className="font-bold text-gray-900">Progresso por Etapa</h3>
            </div>
            {detail.progresso.length === 0 ? (
              <StateDisplay type="empty" message="Sem progresso registrado para este alfabetizando." />
            ) : (
              <div className="p-6 space-y-4">
                {detail.progresso.map((item) => (
                  <div key={item.etapa} className="flex items-center gap-4">
                    <div className="w-32">
                      <p className="text-sm font-bold text-gray-900">{item.etapa}</p>
                      <p className="text-xs text-gray-500">
                        {item.concluidas}/{item.atividades} atividades
                      </p>
                    </div>
                    <div className="flex-1 h-4 bg-gray-200 border border-gray-300">
                      <div className="h-full bg-gray-900" style={{ width: `${item.progresso}%` }} />
                    </div>
                    <span className="text-sm text-gray-700 w-14">{item.progresso}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-gray-300 bg-white">
            <div className="p-4 border-b border-gray-300">
              <h3 className="font-bold text-gray-900">Tentativas e Erros</h3>
            </div>
            {detail.tentativas.length === 0 ? (
              <StateDisplay type="empty" message="Sem tentativas registradas." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Atividade</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acertos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Erros</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.tentativas.map((attempt) => (
                      <tr key={attempt.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{attempt.atividade}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{attempt.data}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{attempt.acertos}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{attempt.erros}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{attempt.taxa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-gray-300 bg-white">
            <div className="p-4 border-b border-gray-300">
              <h3 className="font-bold text-gray-900">Submissões (Fotos/Áudios)</h3>
            </div>
            {detail.submissoes.length === 0 ? (
              <StateDisplay type="empty" message="Sem submissoes pendentes ou aprovadas." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Atividade</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.submissoes.map((submission) => (
                      <tr key={submission.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{submission.tipo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{submission.atividade}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{submission.data}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{submission.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-gray-300 bg-white">
            <div className="p-4 border-b border-gray-300 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Linha do tempo</h3>
              <span className="text-xs text-gray-500">{detail.historico.length} eventos</span>
            </div>
            {detail.historico.length === 0 ? (
              <StateDisplay type="empty" message="Sem eventos para este alfabetizando." />
            ) : (
              <ol className="p-4 space-y-4 relative" aria-label="Linha do tempo de eventos">
                {detail.historico.map((event, index) => {
                  const { Icon, tone } = timelineVisual(event);
                  const isLast = index === detail.historico.length - 1;
                  const prevDay = index > 0 ? dayBucket(detail.historico[index - 1].data) : "";
                  const currentDay = dayBucket(event.data);
                  const showDayHeader = index === 0 || currentDay !== prevDay;

                  return (
                    <li key={event.id} className="relative">
                      {showDayHeader ? (
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 mt-1">
                          {currentDay}
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center border ${tone} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {!isLast ? (
                          <span
                            className="absolute left-4 top-9 w-px h-full -ml-px bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="flex-1 pb-2">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-900">{event.tipo}</span>
                            {event.status ? (
                              <span className="text-xs px-1.5 py-0.5 border border-gray-300 bg-gray-50 text-gray-700">
                                {event.status}
                              </span>
                            ) : null}
                            <span className="text-xs text-gray-500 ml-auto">{event.data}</span>
                          </div>
                          {event.obs ? (
                            <p className="mt-1 text-sm text-gray-700 leading-relaxed">{event.obs}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-gray-500">por {event.usuario}</p>
                          {event.actionable && (event.queueType === "ajuda" || event.queueType === "progresso") ? (
                            <button
                              type="button"
                              onClick={() => void runHistoryAction(event)}
                              disabled={Boolean(actionLoadingId)}
                              className="mt-2 px-3 py-1.5 border border-gray-900 bg-gray-900 text-white text-xs font-semibold disabled:opacity-60"
                            >
                              {actionLoadingId === event.id
                                ? "Atualizando..."
                                : event.queueType === "progresso"
                                  ? "Desbloquear aluno"
                                  : "Marcar como atendido"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}
