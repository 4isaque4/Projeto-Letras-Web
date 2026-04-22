import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Lock } from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";

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
  }, [id]);

  const statusLabel = useMemo(() => {
    if (!detail?.status) {
      return "";
    }
    return detail.status;
  }, [detail?.status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 border border-gray-400 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">T5. Detalhe do Alfabetizando</h1>
          <p className="text-sm text-gray-600 mt-1">Acompanhamento completo do progresso e historico</p>
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
              <h3 className="font-bold text-gray-900">Submissoes (Fotos/Audios)</h3>
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
            <div className="p-4 border-b border-gray-300">
              <h3 className="font-bold text-gray-900">Historico de Atendimento</h3>
            </div>
            {detail.historico.length === 0 ? (
              <StateDisplay type="empty" message="Sem eventos de historico para este alfabetizando." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.historico.map((history) => (
                      <tr key={history.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{history.tipo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{history.data}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{history.usuario}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{history.obs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
