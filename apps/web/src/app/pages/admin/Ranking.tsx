import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";

type TabKey = "alunos" | "tutores";

interface StudentRankingItem {
  pos: number;
  id: string;
  nome: string;
  grupo: string;
  pontos: number;
  etapa: string;
}

interface TutorRankingItem {
  pos: number;
  id: string;
  nome: string;
  alunos: number;
  pontos: number;
  taxa: string;
}

interface LedgerItem {
  id: string;
  data: string;
  descricao: string;
  pontos: string;
  saldo: string;
}

interface RankingResponse {
  rankingAlunos: StudentRankingItem[];
  rankingTutores: TutorRankingItem[];
  extrato: LedgerItem[];
}

const EMPTY_RESPONSE: RankingResponse = {
  rankingAlunos: [],
  rankingTutores: [],
  extrato: [],
};

export default function Ranking() {
  const [activeTab, setActiveTab] = useState<TabKey>("alunos");
  const [response, setResponse] = useState<RankingResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = (await apiGet("/painel/ranking")) as RankingResponse;
        if (!active) {
          return;
        }
        setResponse({
          rankingAlunos: payload.rankingAlunos ?? [],
          rankingTutores: payload.rankingTutores ?? [],
          extrato: payload.extrato ?? [],
        });
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar ranking.");
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
  }, []);

  const rankingRows = useMemo(() => {
    if (activeTab === "alunos") {
      return response.rankingAlunos;
    }
    return response.rankingTutores;
  }, [activeTab, response.rankingAlunos, response.rankingTutores]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pontuação e Ranking</h1>
        <p className="text-sm text-gray-600 mt-1">Ranking consolidado com base no progresso real</p>
      </div>

      <div className="border border-gray-300 bg-white">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("alunos")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "alunos"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ranking de Alunos ({response.rankingAlunos.length})
          </button>
          <button
            onClick={() => setActiveTab("tutores")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "tutores"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ranking de Tutores ({response.rankingTutores.length})
          </button>
        </div>

        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : rankingRows.length === 0 ? (
          <StateDisplay type="empty" message="Sem registros de ranking no momento." />
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "alunos" ? (
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pos</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Grupo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {response.rankingAlunos.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.pos <= 3 && (
                            <Trophy
                              className={`w-4 h-4 ${
                                item.pos === 1
                                  ? "text-yellow-600"
                                  : item.pos === 2
                                    ? "text-gray-400"
                                    : "text-yellow-700"
                              }`}
                            />
                          )}
                          <span className="text-sm font-bold text-gray-900">{item.pos}o</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.grupo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.etapa}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.pontos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pos</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700"># Alunos</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontos</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {response.rankingTutores.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.pos <= 3 && (
                            <Trophy
                              className={`w-4 h-4 ${
                                item.pos === 1
                                  ? "text-yellow-600"
                                  : item.pos === 2
                                    ? "text-gray-400"
                                    : "text-yellow-700"
                              }`}
                            />
                          )}
                          <span className="text-sm font-bold text-gray-900">{item.pos}o</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.alunos}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.pontos}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.taxa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Extrato de Pontos</h3>
          <p className="text-xs text-gray-600 mt-1">Ultimas movimentacoes registradas</p>
        </div>
        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : response.extrato.length === 0 ? (
          <StateDisplay type="empty" message="Sem movimentacoes de pontos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Descricao</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {response.extrato.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{item.data}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.descricao}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.pontos}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
